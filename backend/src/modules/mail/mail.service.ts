import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { LoggerService } from '../logger/logger.service';

/** 解析 MAIL_FROM，支持 `名称<addr@dom>` 或纯邮箱 */
export function formatMailFromHeader(raw: string, fallbackAddress: string): string {
  const s = raw.trim();
  if (!s) return fallbackAddress;
  const m = s.match(/^(.+)<([^>]+)>\s*$/);
  if (m) {
    const name = m[1].trim().replace(/^["']|["']$/g, '');
    const addr = m[2].trim();
    return name ? `"${name}" <${addr}>` : addr;
  }
  return s;
}

/** 验证码邮件场景（用于模板与日志） */
export type OtpMailScene = 'register' | 'login_otp' | 'password_reset';

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildOtpEmailBody(
  code: string,
  scene: OtpMailScene,
  lang: string,
  i18n: I18nService,
): { text: string; html: string; subject: string } {
  const headline = i18n.t(`mail.otpHeadline.${scene}`, { lang });
  const subject = i18n.t(`mail.otpSubject.${scene}`, { lang });
  const text = [
    i18n.t('mail.otpTextHeader', { lang, args: { headline } }),
    '',
    i18n.t('mail.otpCodeLine', { lang, args: { code } }),
    '',
    i18n.t('mail.otpTextFooter', { lang }),
    '',
    i18n.t('mail.otpTextAuto', { lang }),
  ].join('\n');

  const safeCode = escHtml(code);
  const safeHeadline = escHtml(headline);
  const htmlIntro = i18n.t('mail.otpHtmlIntro', { lang });

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#e8ecf1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8ecf1;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:14px;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 26px 22px;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.06em;color:#64748b;text-transform:uppercase;">ClueArk</p>
              <h1 style="margin:0 0 14px;font-size:19px;font-weight:600;color:#0f172a;line-height:1.35;">${safeHeadline}</h1>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#334155;">
                ${htmlIntro}
              </p>
              <div style="text-align:center;margin:22px 0;padding:18px 12px;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);border-radius:12px;border:1px solid #e2e8f0;">
                <span style="display:inline-block;font-size:26px;font-weight:700;letter-spacing:0.42em;padding-left:0.42em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#0f172a;">${safeCode}</span>
              </div>
              <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px;">
                <strong style="color:#64748b;">${escHtml(i18n.t('mail.otpHtmlAboutTitle', { lang }))}</strong><br/>
                ${escHtml(i18n.t('mail.otpHtmlAboutBody', { lang }))}
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#cbd5e1;">${escHtml(i18n.t('mail.otpHtmlAuto', { lang }))}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { text, html, subject };
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger: LoggerService;
  private transporter: Transporter | null = null;
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly user: string;
  private readonly password: string;
  private readonly fromHeader: string;

  constructor(
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(MailService.name);
    this.host = (this.config.get<string>('MAIL_HOST') || '').trim();
    this.port = Number(this.config.get<string>('MAIL_PORT') || this.config.get<number>('MAIL_PORT') || 465);
    const sec = this.config.get<string>('MAIL_SECURE');
    this.secure = sec === undefined ? true : `${sec}`.toLowerCase() === 'true';
    this.user = (this.config.get<string>('MAIL_USER') || '').trim();
    this.password = (this.config.get<string>('MAIL_PASSWORD') || '').trim();
    const fromRaw = (this.config.get<string>('MAIL_FROM') || '').trim();
    this.fromHeader = formatMailFromHeader(fromRaw, this.user);
  }

  async onModuleInit(): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        '邮件服务未配置（需 MAIL_HOST、MAIL_USER、MAIL_PASSWORD）；验证码将仅写入应用日志，不会发信。',
      );
      return;
    }
    this.logger.log(
      `邮件服务初始化：SMTP ${this.host}:${this.port} secure=${this.secure} 发件人=${this.fromHeader || this.user}`,
    );
    try {
      const t = this.getTransport();
      if (t) {
        await t.verify();
        this.logger.log('邮件服务 SMTP 连接校验成功（verify），可以发信。');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `邮件服务 SMTP verify 未通过（部分厂商仍允许发信）：${msg}。若发信失败请检查网络、端口与账号授权。`,
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.host && this.user && this.password);
  }

  private getTransport(): Transporter | null {
    if (!this.isConfigured()) {
      return null;
    }
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: { user: this.user, pass: this.password },
      });
    }
    return this.transporter;
  }

  /** 纯文本邮件（内部或简单通知用） */
  async sendPlain(to: string, subject: string, text: string): Promise<void> {
    const t = this.getTransport();
    if (!t) {
      return;
    }
    const toNorm = to.trim().toLowerCase();
    this.logger.log(`[mail] 准备发送（纯文本） to=${toNorm} subject=${subject}`);
    await t.sendMail({
      from: this.fromHeader || this.user,
      to: toNorm,
      subject,
      text,
    });
    this.logger.log(`[mail] 已发送（纯文本） to=${toNorm} subject=${subject}`);
  }

  /**
   * 发送带 HTML 模板的验证码邮件；同时带 text /plain 便于客户端降级。
   * 成功后会打日志（含 scene 与验证码，便于联调；生产若介意可改为仅 debug）。
   */
  async sendOtpEmail(params: {
    to: string;
    code: string;
    scene: OtpMailScene;
    lang: string;
  }): Promise<void> {
    const t = this.getTransport();
    if (!t) {
      return;
    }
    const toNorm = params.to.trim().toLowerCase();
    const { text, html, subject } = buildOtpEmailBody(params.code, params.scene, params.lang, this.i18n);
    this.logger.log(
      `[mail] 准备发送验证码邮件 to=${toNorm} scene=${params.scene} subject=${subject} code=${params.code}`,
    );
    await t.sendMail({
      from: this.fromHeader || this.user,
      to: toNorm,
      subject,
      text,
      html,
    });
    this.logger.log(
      `[mail] 验证码邮件已发送 to=${toNorm} scene=${params.scene} subject=${subject} code=${params.code}`,
    );
  }
}
