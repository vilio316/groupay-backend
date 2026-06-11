import { Body, Controller, Get, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { NotificationDto } from './notifications.dto';

@OptionalAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  fetchNotifs() {
    return this.notifications.getNotifs();
  }

  @Post()
  postNotification(@Body() body: NotificationDto) {
    return this.notifications.sendNotification(body);
  }
}
