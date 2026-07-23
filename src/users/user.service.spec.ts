import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { PinService } from '../pin/pin.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: Record<string, any>;
  let pinService: Record<string, any>;

  const mockUser1 = {
    id: 'user-1',
    email: 'alice@test.com',
    name: 'Alice',
    accountNumber: '1234567890',
    accountBalance: 100000,
    pinSet: false,
    pin: null,
  };

  const mockUser1WithPin = {
    ...mockUser1,
    pinSet: true,
    pin: 'salt:hash',
  };

  const mockUser2 = {
    id: 'user-2',
    email: 'bob@test.com',
    name: 'Bob',
    accountNumber: '0987654321',
    accountBalance: 50000,
    pinSet: false,
    pin: null,
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    clusterMember: {
      findMany: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  };

  const mockPinService = {
    verifyPin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PinService, useValue: mockPinService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
    pinService = module.get(PinService);
    jest.clearAllMocks();
  });

  describe('fetchUser', () => {
    it('should return user by email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser1);
      const result = await service.fetchUser('alice@test.com');
      expect(result).toEqual(mockUser1);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'alice@test.com' },
      });
    });

    it('should return null when email not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.fetchUser('nobody@test.com');
      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user with their cluster memberships', async () => {
      const clusters = [{ id: 'cm-1', clusterId: 'cluster-1', userId: 'user-1' }];
      mockPrisma.user.findUnique.mockResolvedValue(mockUser1);
      mockPrisma.clusterMember.findMany.mockResolvedValue(clusters);

      const result = await service.getUserById('user-1');
      expect(result).toMatchObject({ ...mockUser1, clusters });
    });
  });

  describe('getUsersByValue', () => {
    it('should return matching users by email', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser1]);
      const result = await service.getUsersByValue('alice');
      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { email: 'alice' },
      });
    });

    it('should return empty array when no match', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      const result = await service.getUsersByValue('nobody');
      expect(result).toEqual([]);
    });
  });

  describe('getUserAccount', () => {
    it('should return account number and balance', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        accountBalance: 100000,
        accountNumber: '1234567890',
      });
      const result = await service.getUserAccount('user-1');
      expect(result).toEqual({ accountBalance: 100000, accountNumber: '1234567890' });
    });

    it('should return null for nonexistent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const result = await service.getUserAccount('nobody');
      expect(result).toBeNull();
    });
  });

  describe('transferFunds', () => {
    const validTransfer = {
      senderId: 'user-1',
      recipientId: 'user-2',
      amount: 30000,
    };

    it('should throw when transferring to self', async () => {
      await expect(
        service.transferFunds({ ...validTransfer, recipientId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when amount is zero or negative', async () => {
      await expect(
        service.transferFunds({ ...validTransfer, amount: 0 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.transferFunds({ ...validTransfer, amount: -100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when sender is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.transferFunds(validTransfer)).rejects.toThrow(BadRequestException);
    });

    it('should throw when recipient is not found', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(null);
      await expect(service.transferFunds(validTransfer)).rejects.toThrow(BadRequestException);
    });

    it('should throw when balance is insufficient', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      await expect(
        service.transferFunds({ ...validTransfer, amount: 999999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when pin is required but not provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser1WithPin);
      await expect(service.transferFunds(validTransfer)).rejects.toThrow(ForbiddenException);
    });

    it('should throw when pin is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser1WithPin);
      mockPinService.verifyPin.mockRejectedValueOnce(new ForbiddenException('Incorrect PIN'));
      await expect(
        service.transferFunds({ ...validTransfer, pin: '0000' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should transfer funds successfully', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({
        transactionRef: 'GP-user-1-1712345678',
        transactionHeading: 'Wallet Transfer',
        type: 'outbound',
        senderId: 'user-1',
        recipientId: 'user-2',
        amount: 30000,
        channel: 'groupay-wallet',
        status: 'Success',
      });

      const result = await service.transferFunds(validTransfer);
      expect(result.success).toBe(true);
      expect(result.transactionRef).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { accountBalance: { decrement: 30000 } },
      });
    });

    it('should verify pin when sender has pinSet', async () => {
      const userWithPin = { ...mockUser1, pinSet: true };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(userWithPin)
        .mockResolvedValueOnce(mockUser2);
      mockPinService.verifyPin.mockResolvedValue({ success: true });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({});

      const result = await service.transferFunds({ ...validTransfer, pin: '1234' });
      expect(result.success).toBe(true);
      expect(mockPinService.verifyPin).toHaveBeenCalledWith('user-1', '1234');
    });
  });
});
