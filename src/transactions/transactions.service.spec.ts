import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let prisma: Record<string, any>;

  const mockTxn = {
    id: 'txn-1',
    transactionRef: 'GP-test-1712345678',
    transactionHeading: 'Wallet Transfer',
    type: 'outbound',
    senderId: 'user-1',
    recipientId: 'user-2',
    amount: 50000,
    channel: 'groupay-wallet',
    status: 'Success',
    createdAt: new Date(),
  };

  const mockWebhookEvent = {
    id: 'webhook-1',
    transactionReference: 'GP-test-1712345678',
    rawPayload: { Body: { email: 'sender@test.com' } },
  };

  const mockPrisma = {
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    webhookEvent: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('getAllTxns', () => {
    it('should return all transactions when no userId is given', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTxn]);
      const result = await service.getAllTxns();
      expect(result).toHaveLength(1);
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by userId and add direction when userId is given', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTxn]);
      const result = await service.getAllTxns('user-2');
      expect(result).toHaveLength(1);
      expect(result[0].direction).toBe('inbound');
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ senderId: 'user-2' }, { recipientId: 'user-2' }],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should set direction to outbound when user is the sender', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTxn]);
      const result = await service.getAllTxns('user-1');
      expect(result[0].direction).toBe('outbound');
    });

    it('should return empty array when no transactions exist', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      const result = await service.getAllTxns('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('getTrx', () => {
    it('should return transaction with sender email from webhook', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(mockTxn);
      mockPrisma.webhookEvent.findFirst.mockResolvedValue(mockWebhookEvent);

      const result = await service.getTrx('GP-test-1712345678');
      expect(result.transactionRef).toBe('GP-test-1712345678');
      expect(result.sender).toBe('sender@test.com');
    });

    it('should mark sender as unavailable when no webhook has email', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(mockTxn);
      mockPrisma.webhookEvent.findFirst.mockResolvedValue(null);

      const result = await service.getTrx('GP-test-1712345678');
      expect(result.sender).toBe('unavailable');
    });

    it('should return object with null fields and unavailable sender when transaction does not exist', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      mockPrisma.webhookEvent.findFirst.mockResolvedValue(null);

      const result = await service.getTrx('nonexistent');
      expect(result.sender).toBe('unavailable');
    });
  });
});
