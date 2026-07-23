import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: Record<string, any>;

  const mockNotif = {
    id: 'notif-1',
    senderId: 'user-1',
    recipientId: 'user-2',
    message: 'Hello!',
    type: 'join',
    isRead: false,
    createdAt: new Date(),
  };

  const mockPrisma = {
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('getNotifs', () => {
    it('should return all notifications ordered by createdAt desc', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotif]);
      const result = await service.getNotifs();
      expect(result).toEqual([mockNotif]);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getUserNotis', () => {
    it('should return notifications filtered by recipientId', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotif]);
      const result = await service.getUserNotis('user-2');
      expect(result).toEqual([mockNotif]);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-2' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      const result = await service.getUserNotis('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('sendNotification', () => {
    it('should create a notification with the given data', async () => {
      const dto = {
        senderId: 'user-1',
        recipientId: 'user-2',
        message: 'Test message',
        type: 'alert',
      };
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-new', ...dto, isRead: false, createdAt: new Date() });

      const result = await service.sendNotification(dto);
      expect(result).toMatchObject({ senderId: 'user-1', recipientId: 'user-2', message: 'Test message', type: 'alert' });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      const updated = { ...mockNotif, isRead: true };
      mockPrisma.notification.update.mockResolvedValue(updated);
      const result = await service.markNotificationAsRead('notif-1');
      expect(result.isRead).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
    });
  });
});
