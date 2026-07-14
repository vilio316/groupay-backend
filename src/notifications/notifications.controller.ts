import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { NotificationDto } from './notifications.dto';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('Notifications')
@OptionalAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all notifications', description: 'Retrieves all notifications across the platform.' })
  @ApiResponse({ status: 200, description: 'Notifications returned' })
  fetchNotifs() {
    return this.notifications.getNotifs();
  }

  @Get(`:id`)
  @ApiOperation({ summary: "Get user's notifications", description: 'Retrieves all notifications for a specific user by their user ID.' })
  @ApiParam({ name: 'id', description: 'The user ID', example: 'user_abc123' })
  @ApiResponse({ status: 200, description: 'User notifications returned' })
  getMyNotifs(@Param('id') id: string) {
    return this.notifications.getUserNotis(id);
  }

  @Post()
  @ApiOperation({ summary: 'Send a notification', description: 'Creates and sends a notification from one user to another.' })
  @ApiBody({ type: NotificationDto, description: 'Notification payload' })
  @ApiResponse({ status: 201, description: 'Notification sent' })
  postNotification(@Body() body: NotificationDto) {
    return this.notifications.sendNotification(body);
  }

  @Patch(`/item/:id`)
  @ApiOperation({ summary: 'Mark notification as read', description: 'Marks a single notification as read by its notification ID.' })
  @ApiParam({ name: 'id', description: 'The notification ID', example: 'notif_abc123' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Param('id') id: string) {
    return this.notifications.markNotificationAsRead(id);
  }
}
