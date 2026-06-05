import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { LoggerService } from '../../modules/logger/logger.service';
import { normalizeLocale } from '../utils/locale.utils';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: LoggerService;

  constructor(
    loggerService: LoggerService,
    private readonly i18n: I18nService,
  ) {
    this.logger = loggerService.createLogger('ExceptionFilter');
  }

  private resolveLang(host: ArgumentsHost, request: Request): string {
    const ctx = I18nContext.current(host);
    if (ctx?.lang) return normalizeLocale(ctx.lang);
    const header = request.headers['accept-language'];
    if (typeof header === 'string' && header.trim()) {
      const first = header.split(',')[0]?.trim() || '';
      const token = first.split(';')[0]?.trim() || '';
      return normalizeLocale(token);
    }
    return 'en';
  }

  private extractRawMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.map((m) => String(m)).join('; ');
    if (message && typeof message === 'object' && 'message' in message) {
      return this.extractRawMessage((message as { message: unknown }).message);
    }
    return 'internal_error';
  }

  private translateMessage(raw: string, lang: string): string {
    if (!/^[a-z][a-z0-9_]*$/i.test(raw)) return raw;
    const key = `error.${raw}`;
    const translated = String(this.i18n.t(key, { lang, defaultValue: '' }));
    if (translated && translated !== key) return translated;
    return raw;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'internal_error';

    const lang = this.resolveLang(host, request);
    const rawMessage = this.extractRawMessage(rawResponse);
    const message = this.translateMessage(rawMessage, lang);

    const errorResponse = {
      code: status,
      data: null,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(`${request.method} ${request.url} - ${status}`, stack, 'ExceptionFilter');

    response.status(status).json(errorResponse);
  }
}
