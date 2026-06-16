import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Get(`:id`)
  getMyNotifs(@Param('id') id: string) {
    return this.notifications.getUserNotis(id);
  }

  @Post()
  postNotification(@Body() body: NotificationDto) {
    return this.notifications.sendNotification(body);
  }
}
