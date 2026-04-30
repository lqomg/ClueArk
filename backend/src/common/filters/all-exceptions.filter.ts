import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: LoggerService;

  constructor(loggerService: LoggerService) {
    this.logger = loggerService.createLogger('ExceptionFilter');
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception.message || 'Internal server error';

    // 统一错误响应格式
    const errorResponse = {
      code: status,
      data: null,
      message: typeof message === 'string' ? message : (message as any).message || message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception.stack,
      'ExceptionFilter',
    );

    // 记录详细的错误信息
    this.logger.error({
      message: 'Exception caught',
      errorResponse,
      exception: {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      },
      request: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        body: request.body,
        query: request.query,
        params: request.params,
      },
    });

    response.status(status).json(errorResponse);
  }
}
