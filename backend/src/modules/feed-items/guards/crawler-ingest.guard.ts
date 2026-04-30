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
 * 爬虫服务上报：Authorization: Bearer <CRAWLER_INGEST_SECRET> 或 x-crawler-ingest-secret
 */
@Injectable()
export class CrawlerIngestGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('CRAWLER_INGEST_SECRET')?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('crawler_ingest_not_configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const headerSecret =
      typeof req.headers['x-crawler-ingest-secret'] === 'string' ? req.headers['x-crawler-ingest-secret'].trim() : '';

    if (bearer === secret || headerSecret === secret) {
      return true;
    }

    throw new UnauthorizedException('invalid_crawler_ingest_secret');
  }
}
