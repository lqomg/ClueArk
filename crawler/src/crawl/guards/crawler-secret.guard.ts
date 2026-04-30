import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * POST /api/crawl/run：校验 Authorization: Bearer <CRAWLER_SECRET> 或 x-crawler-secret。
 * 生产环境未配置 CRAWLER_SECRET 时拒绝服务。
 */
@Injectable()
export class CrawlerSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('CRAWLER_SECRET')?.trim();
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('CRAWLER_SECRET 未配置');
      }
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const headerSecret = typeof req.headers['x-crawler-secret'] === 'string' ? req.headers['x-crawler-secret'].trim() : '';

    if (bearer === secret || headerSecret === secret) {
      return true;
    }

    throw new UnauthorizedException('invalid_crawler_secret');
  }
}
