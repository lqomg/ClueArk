import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoggerService } from '../../logger';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger: LoggerService;

  constructor(loggerService: LoggerService) {
    super();
    this.logger = loggerService.createLogger(JwtAuthGuard.name);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const req = context?.switchToHttp?.().getRequest?.();
      this.logger.warn({
        message: 'JWT auth failed',
        method: req?.method,
        url: req?.originalUrl || req?.url,
        ip: req?.ip,
        reason: info?.message || err?.message || 'Unknown',
      });
    }
    return super.handleRequest(err, user, info, context);
  }
}
