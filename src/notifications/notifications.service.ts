import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  getNotifs() {
    return this.prisma.notification.findMany({
      //   orderBy: { createdAt: 'desc' },
    });
  }

  async sendNotification({
    senderId,
    recipientId,
    type,
    message,
  }: NotificationDto) {
    await this.prisma.notification.create({
      data: {
        senderId: senderId,
        recipientId: recipientId,
        message: message,
        type: type,
      },
    });
  }
}
