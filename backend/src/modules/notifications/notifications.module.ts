import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { FeedItemsModule } from '../feed-items/feed-items.module';
import { FeedItem, FeedItemSchema } from '../feed-items/schemas/feed-item.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    AuthGuardsModule,
    FeedItemsModule,
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
