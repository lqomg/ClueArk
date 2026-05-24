import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthCoreModule } from '../auth/auth-core.module';
import { FeedItem, FeedItemSchema } from '../feed-items/schemas/feed-item.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    AuthCoreModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: FeedItem.name, schema: FeedItemSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
