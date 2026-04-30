import { Injectable, LoggerService as ILoggerService } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';

@Injectable()
export class LoggerService implements ILoggerService {
  private context?: string;
  private winstonLogger: Logger;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
  ) {
    this.winstonLogger = logger;
  }

  setContext(context: string) {
    this.context = context;
    return this; // 支持链式调用
  }

  /**
   * 创建一个带有固定 context 的新 Logger 实例
   * 用于在服务中避免 context 冲突
   */
  createLogger(context: string): LoggerService {
    const newLogger = new LoggerService(this.winstonLogger);
    newLogger.setContext(context);
    return newLogger;
  }

  log(message: any, context?: string) {
    const logContext = context || this.context;
    
    if (typeof message === 'object') {
      const { message: msg, ...meta } = message;
      this.winstonLogger.info(msg, { context: logContext, ...meta });
    } else {
      this.winstonLogger.info(message, { context: logContext });
    }
  }

  error(message: any, trace?: string, context?: string) {
    const logContext = context || this.context;
    
    if (message instanceof Error) {
      this.winstonLogger.error(message.message, {
        context: logContext,
        trace: message.stack,
      });
    } else if (typeof message === 'object') {
      const { message: msg, ...meta } = message;
      this.winstonLogger.error(msg, {
        context: logContext,
        trace,
        ...meta,
      });
    } else {
      this.winstonLogger.error(message, {
        context: logContext,
        trace,
      });
    }
  }

  warn(message: any, context?: string) {
    const logContext = context || this.context;
    
    if (typeof message === 'object') {
      const { message: msg, ...meta } = message;
      this.winstonLogger.warn(msg, { context: logContext, ...meta });
    } else {
      this.winstonLogger.warn(message, { context: logContext });
    }
  }

  debug(message: any, context?: string) {
    const logContext = context || this.context;
    
    if (typeof message === 'object') {
      const { message: msg, ...meta } = message;
      this.winstonLogger.debug(msg, { context: logContext, ...meta });
    } else {
      this.winstonLogger.debug(message, { context: logContext });
    }
  }

  verbose(message: any, context?: string) {
    const logContext = context || this.context;
    
    if (typeof message === 'object') {
      const { message: msg, ...meta } = message;
      this.winstonLogger.verbose(msg, { context: logContext, ...meta });
    } else {
      this.winstonLogger.verbose(message, { context: logContext });
    }
  }

  // HTTP请求日志专用方法
  http(message: string, meta?: any) {
    this.winstonLogger.log('http', message, { context: this.context, ...meta });
  }
}
