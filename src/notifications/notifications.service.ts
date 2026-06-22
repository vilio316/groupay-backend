import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  getNotifs() {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  getUserNotis(id: string) {
    return this.prisma.notification.findMany({
      where: {
        recipientId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async sendNotification({
    senderId,
    recipientId,
    type,
    message,
  }: NotificationDto) {
    return this.prisma.notification.create({
      data: {
        senderId: senderId,
        recipientId: recipientId,
        message: message,
        type: type,
      },
    });
  }

  markNotificationAsRead(id: string) {
    return this.prisma.notification.update({
      where: {
        id: id,
      },
      data: {
        isRead: true,
      },
    });
  }
}
