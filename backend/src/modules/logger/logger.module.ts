import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';
import { LoggerService } from './logger.service';

// 日志目录配置
const LOG_DIR = process.env.LOG_DIR || join(process.cwd(), 'logs');

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: () => new Date().toISOString() }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, context, trace, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}] ${context ? `[${context}]` : ''} ${message}`;
    
    // 添加元数据
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    // 添加堆栈跟踪
    if (trace) {
      msg += `\n${trace}`;
    }
    
    return msg;
  }),
);

// 控制台日志格式（带颜色）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: () => new Date().toISOString() }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, context, trace, ...metadata }) => {
    let msg = `${timestamp} ${level} ${context ? `[${context}]` : ''} ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    if (trace) {
      msg += `\n${trace}`;
    }
    return msg;
  }),
);

// 统一日志滚动配置（按小时分割）
const appRotateTransport = new DailyRotateFile({
  filename: join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD', // 按小时分割
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '30d', // 保留30天
  format: logFormat,
});

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
      },
      transports: [
        // 控制台输出
        new winston.transports.Console({
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          format: consoleFormat,
        }),
        // 统一日志文件（按小时分割）
        appRotateTransport,
      ],
      exceptionHandlers: [
        // 未捕获异常日志（使用同一个文件）
        appRotateTransport,
      ],
      rejectionHandlers: [
        // 未处理的Promise拒绝日志（使用同一个文件）
        appRotateTransport,
      ],
    }),
  ],
  providers: [LoggerService],
  exports: [WinstonModule, LoggerService],
})
export class LoggerModule {}
