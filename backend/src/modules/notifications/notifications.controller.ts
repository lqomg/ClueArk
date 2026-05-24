import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import type { Response } from 'express';
import IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REDIS_CHANNEL_NOTIFICATION } from './notifications.constants';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  private redis: IORedis | null = null;
  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (url) this.redis = new IORedis(url, { maxRetriesPerRequest: null });
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('userId') userId: string) {
    return this.notifications.countUnread(userId).then((count) => ({ count }));
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('userId') userId: string) {
    return this.notifications.markAllRead(userId).then((modified) => ({ modified }));
  }

  @Get()
  list(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(50, Math.max(1, Number(pageSize) || 20));
    return this.notifications.listForUser(userId, p, ps);
  }

  @Patch(':id/read')
  async markRead(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    const ok = await this.notifications.markRead(userId, id);
    return { ok };
  }

  @Get('stream')
  async stream(
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    if (!this.redis) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: 'redis_unavailable' })}\n\n`,
      );
      res.end();
      return;
    }
    const sub = this.redis.duplicate();
    await sub.subscribe(REDIS_CHANNEL_NOTIFICATION);
    const onMsg = (_ch: string, raw: string) => {
      try {
        const data = JSON.parse(raw) as { userId?: string };
        if (data.userId === userId) {
          res.write(`data: ${raw}\n\n`);
        }
      } catch {
        /* ignore */
      }
    };
    sub.on('message', onMsg);
    reqOnClose(res, async () => {
      sub.off('message', onMsg);
      await sub.quit();
    });
  }
}
function reqOnClose(res: Response, fn: () => void): void {
  res.on('close', fn);
}
