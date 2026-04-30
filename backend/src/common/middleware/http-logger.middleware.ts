import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger: LoggerService;

  constructor(loggerService: LoggerService) {
    this.logger = loggerService.createLogger('HTTP');
  }

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    // 请求开始日志
    this.logger.http(`⬆️  ${method} ${originalUrl} - ${ip} - ${userAgent}`);

    // 响应完成时记录日志
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;
      const contentLength = res.get('content-length') || '-';

      // 根据状态码选择日志级别
      if (statusCode >= 500) {
        this.logger.error({
          message: `⬇️  ${method} ${originalUrl} ${statusCode} ${responseTime}ms - ${contentLength}`,
          method,
          url: originalUrl,
          statusCode,
          responseTime,
          ip,
          userAgent,
        });
      } else if (statusCode >= 400) {
        this.logger.warn({
          message: `⬇️  ${method} ${originalUrl} ${statusCode} ${responseTime}ms - ${contentLength}`,
          method,
          url: originalUrl,
          statusCode,
          responseTime,
          ip,
          userAgent,
        });
      } else {
        this.logger.http(
          `⬇️  ${method} ${originalUrl} ${statusCode} ${responseTime}ms - ${contentLength}`,
          {
            method,
            url: originalUrl,
            statusCode,
            responseTime,
            ip,
            userAgent,
            contentLength,
          },
        );
      }
    });

    next();
  }
}
