import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PinService } from './pin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PinService', () => {
  let service: PinService;
  let prisma: Record<string, any>;

  const mockUser = {
    id: 'user-1',
    pin: null,
    pinSet: false,
  };

  const { scryptSync, randomBytes } = require('crypto');
  const testSalt = randomBytes(16).toString('hex');
  const testHash = scryptSync('1234', testSalt, 64).toString('hex');

  const mockUserWithPin = {
    id: 'user-1',
    pin: `${testSalt}:${testHash}`,
    pinSet: true,
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PinService>(PinService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('setPin', () => {
    it('should throw if pin is not exactly 4 digits', async () => {
      await expect(service.setPin('user-1', '123')).rejects.toThrow(BadRequestException);
      await expect(service.setPin('user-1', '12345')).rejects.toThrow(BadRequestException);
      await expect(service.setPin('user-1', 'abcd')).rejects.toThrow(BadRequestException);
      await expect(service.setPin('user-1', '')).rejects.toThrow(BadRequestException);
    });

    it('should throw if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.setPin('user-1', '1234')).rejects.toThrow(BadRequestException);
    });

    it('should throw if pin is already set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPin);
      await expect(service.setPin('user-1', '1234')).rejects.toThrow(BadRequestException);
    });

    it('should set pin successfully when all conditions are met', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, pinSet: true, pin: 'salt:hash' });

      const result = await service.setPin('user-1', '1234');
      expect(result).toEqual({ success: true, message: 'PIN set successfully' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ pinSet: true }),
      });
    });
  });

  describe('changePin', () => {
    it('should throw if new pin is not exactly 4 digits', async () => {
      await expect(service.changePin('user-1', '1234', '123')).rejects.toThrow(BadRequestException);
    });

    it('should throw if current pin verification fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPin);
      await expect(service.changePin('user-1', '0000', '5678')).rejects.toThrow(ForbiddenException);
    });

    it('should change pin successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPin);
      mockPrisma.user.update.mockResolvedValue(mockUserWithPin);

      const result = await service.changePin('user-1', '1234', '5678');
      expect(result).toEqual({ success: true, message: 'PIN changed successfully' });
    });
  });

  describe('verifyPin', () => {
    it('should throw if pin is not exactly 4 digits', async () => {
      await expect(service.verifyPin('user-1', '12')).rejects.toThrow(BadRequestException);
    });

    it('should throw if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyPin('user-1', '1234')).rejects.toThrow(BadRequestException);
    });

    it('should throw if no pin has been set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.verifyPin('user-1', '1234')).rejects.toThrow(BadRequestException);
    });

    it('should throw if pin is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPin);
      await expect(service.verifyPin('user-1', '9999')).rejects.toThrow(ForbiddenException);
    });

    it('should return success if pin matches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPin);

      const result = await service.verifyPin('user-1', '1234');
      expect(result).toEqual({ success: true });
    });
  });

  describe('checkPinStatus', () => {
    it('should throw if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.checkPinStatus('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should return hasPin: true when pin is set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPin);
      const result = await service.checkPinStatus('user-1');
      expect(result).toEqual({ hasPin: true });
    });

    it('should return hasPin: false when pin is not set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.checkPinStatus('user-1');
      expect(result).toEqual({ hasPin: false });
    });
  });
});
