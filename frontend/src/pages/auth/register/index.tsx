import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi, sendRegisterCode } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import {
  AuthBrandingLayout,
  inputClass,
  inputFlexClass,
  primaryBtnClass,
  sendCodeBtnClass,
} from '@/components/auth/AuthBrandingLayout';
import { authErrBoxClass } from '../utils';

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  async function onSendCode() {
    setError(null);
    setSendingCode(true);
    try {
      await sendRegisterCode({ email });
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSendingCode(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError('请先阅读并勾选同意用户协议与隐私政策');
      return;
    }
    if (!codeSent) {
      setError('请先获取邮箱验证码');
      return;
    }
    setLoading(true);
    try {
      const data = await registerApi({ email, code, password, confirmPassword, acceptTerms });
      const uid = data.user.id || data.user._id;
      setSession(data.access_token, {
        id: uid,
        email: data.user.email,
        username: data.user.username,
        role: data.user.role,
        timeZone: data.user.timeZone,
      });
      navigate('/app/sources', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandingLayout title="注册" subtitle="使用邮箱验证码完成注册" showLegalFooter={false}>
      <form className="space-y-3.5" onSubmit={onSubmit}>
        {error ? <div className={authErrBoxClass}>{error}</div> : null}
        <div className="space-y-1.5">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            邮箱 <span className="text-ark-accent opacity-60">*</span>
          </label>
          <div className="flex min-w-0 items-stretch gap-2">
            <input
              type="email"
              className={inputFlexClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@company.com"
              required
            />
            <button
              type="button"
              disabled={sendingCode || !email.trim()}
              onClick={() => void onSendCode()}
              className={sendCodeBtnClass}
            >
              {sendingCode ? '发送中…' : codeSent ? '重新获取' : '获取验证码'}
            </button>
          </div>
          {codeSent ? (
            <p className="pl-1 text-[11px] leading-relaxed text-slate-500">
              验证码已发至邮箱，15 分钟内有效（请留意垃圾箱）。
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            6 位验证码 <span className="text-ark-accent opacity-60">*</span>
          </label>
          <input
            className={`${inputClass} max-w-[12rem] tracking-widest`}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            密码（至少 6 位） <span className="text-ark-accent opacity-60">*</span>
          </label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="至少 6 位"
            required
            minLength={6}
          />
        </div>
        <div className="space-y-1.5">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            确认密码 <span className="text-ark-accent opacity-60">*</span>
          </label>
          <input
            type="password"
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="再次输入"
            required
            minLength={6}
          />
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-white/5"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>
            我已阅读并同意
            <Link to="/legal/terms" className="mx-0.5 text-ark-accent hover:underline" target="_blank">
              《用户服务协议》
            </Link>
            与
            <Link to="/legal/privacy" className="mx-0.5 text-ark-accent hover:underline" target="_blank">
              《隐私政策》
            </Link>
          </span>
        </label>
        <button type="submit" disabled={loading} className={primaryBtnClass}>
          <span className="relative z-10">{loading ? '提交中…' : '注册并登录'}</span>
        </button>
      </form>

      <div className="text-center">
        <Link
          to="/login"
          className="text-xs font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
        >
          已有账号？返回登录
        </Link>
      </div>
    </AuthBrandingLayout>
  );
}
