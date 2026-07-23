import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClustersService } from './clusters.service';
import { PrismaService } from '../prisma/prisma.service';
import { SquadService } from '../squad/squad.service';
import { PinService } from '../pin/pin.service';

describe('ClustersService', () => {
  let service: ClustersService;
  let prisma: Record<string, any>;
  let pinService: Record<string, any>;
  let squadService: Record<string, any>;

  const mockCluster = {
    id: 'cluster-1',
    name: 'Test Cluster',
    desc: 'A test cluster',
    accountNumber: '',
    accountBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    plans: [],
    transactions: [],
  };

  const mockPlan = {
    id: 'plan-1',
    name: 'Test Plan',
    desc: 'A test plan',
    minimumContribution: null,
    planType: 'Subscription',
    status: 'ACTIVE',
    dueDate: new Date(),
    clusterId: 'cluster-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    transactions: [],
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test User',
    accountBalance: 50000,
    accountNumber: '1234567890',
    pinSet: false,
  };

  const mockOrgMembers = [
    { userId: 'user-1', role: 'owner' },
    { userId: 'user-2', role: 'member' },
  ];

  const mockPrisma = {
    cluster: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organization: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    clusterMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    plan: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    planMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    pendingTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const mockPinService = {
    verifyPin: jest.fn(),
  };

  const mockSquadService = {
    virtualAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClustersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SquadService, useValue: mockSquadService },
        { provide: PinService, useValue: mockPinService },
      ],
    }).compile();

    service = module.get<ClustersService>(ClustersService);
    prisma = module.get(PrismaService);
    pinService = module.get(PinService);
    squadService = module.get(SquadService);
    jest.clearAllMocks();
  });

  // ─── Helpers ─────────────────────────────────────────────
  function mockClusterFound(cluster?: any) {
    const c = cluster ?? {
      ...mockCluster,
      members: [{ userId: 'user-1', user: mockUser }],
    };
    mockPrisma.cluster.findUnique.mockResolvedValue(c);
    mockPrisma.member.findMany.mockResolvedValue(mockOrgMembers);
    return c;
  }

  function mockClusterNotFound() {
    mockPrisma.cluster.findUnique.mockResolvedValue(null);
  }

  function mockUsersExist(ids: string[]) {
    mockPrisma.user.findMany.mockResolvedValue(
      ids.map((id: string) => ({ id })),
    );
  }

  // ─── createCluster ───────────────────────────────────────
  describe('createCluster', () => {
    const dto = {
      name: 'New Cluster',
      desc: 'Brand new',
      memberIds: ['user-2'],
    };

    it('should create a cluster and organisation with creator as owner', async () => {
      mockUsersExist(['user-2', 'user-1']);
      mockPrisma.cluster.create.mockResolvedValue({
        ...mockCluster,
        id: 'new-cluster',
        members: [
          { userId: 'user-1', user: { id: 'user-1' } },
          { userId: 'user-2', user: { id: 'user-2' } },
        ],
        plans: [],
        transactions: [],
      });
      mockPrisma.organization.create.mockResolvedValue({});
      mockPrisma.member.findMany.mockResolvedValue([
        { userId: 'user-1', role: 'owner' },
        { userId: 'user-2', role: 'member' },
      ]);

      const result = await service.createCluster(dto, 'user-1');
      expect(result).toBeDefined();
      expect(mockPrisma.cluster.create).toHaveBeenCalled();
      expect(mockPrisma.organization.create).toHaveBeenCalled();
    });

    it('should create cluster without creatorId', async () => {
      mockUsersExist(['user-2']);
      mockPrisma.cluster.create.mockResolvedValue({
        ...mockCluster,
        members: [{ userId: 'user-2', user: { id: 'user-2' } }],
        plans: [],
        transactions: [],
      });
      mockPrisma.organization.create.mockResolvedValue({});
      mockPrisma.member.findMany.mockResolvedValue([
        { userId: 'user-2', role: 'member' },
      ]);

      const result = await service.createCluster(dto);
      expect(result).toBeDefined();
    });

    it('should throw when a user does not exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      await expect(service.createCluster(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findClusters ────────────────────────────────────────
  describe('findClusters', () => {
    it('should return all clusters ordered by createdAt desc', async () => {
      mockPrisma.cluster.findMany.mockResolvedValue([mockCluster]);
      const result = await service.findClusters();
      expect(result).toEqual([mockCluster]);
      expect(mockPrisma.cluster.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ─── findClustersByUser ──────────────────────────────────
  describe('findClustersByUser', () => {
    it('should return cluster memberships for a user', async () => {
      const memberships = [{ id: 'cm-1', clusterId: 'cluster-1', userId: 'user-1', joinedAt: new Date() }];
      mockPrisma.clusterMember.findMany.mockResolvedValue(memberships);
      const result = await service.findClustersByUser('user-1');
      expect(result).toEqual(memberships);
    });
  });

  // ─── findCluster ─────────────────────────────────────────
  describe('findCluster', () => {
    it('should return cluster with member roles attached', async () => {
      mockClusterFound();
      const result = await service.findCluster('cluster-1');
      expect(result.id).toBe('cluster-1');
      expect(mockPrisma.member.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'cluster-1' },
        select: { userId: true, role: true },
      });
    });

    it('should throw NotFoundException when cluster does not exist', async () => {
      mockClusterNotFound();
      await expect(service.findCluster('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── deleteCluster ───────────────────────────────────────
  describe('deleteCluster', () => {
    it('should delete member, org, and cluster', async () => {
      mockClusterFound();
      mockPrisma.member.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.organization.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.cluster.delete.mockResolvedValue(mockCluster);

      const result = await service.deleteCluster('cluster-1');
      expect(result).toEqual(mockCluster);
      expect(mockPrisma.member.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: 'cluster-1' },
      });
      expect(mockPrisma.organization.deleteMany).toHaveBeenCalledWith({
        where: { id: 'cluster-1' },
      });
    });

    it('should throw when cluster not found', async () => {
      mockClusterNotFound();
      await expect(service.deleteCluster('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── updateClusterDetails ────────────────────────────────
  describe('updateClusterDetails', () => {
    it('should update cluster name and desc', async () => {
      mockClusterFound({ ...mockCluster, members: [] });
      mockPrisma.cluster.update.mockResolvedValue({ ...mockCluster, name: 'Updated', desc: 'Updated desc' });
      mockPrisma.member.findMany.mockResolvedValue(mockOrgMembers);

      const result = await service.updateClusterDetails('cluster-1', {
        name: 'Updated',
        desc: 'Updated desc',
      });
      expect(result.name).toBe('Updated');
      expect(mockPrisma.cluster.update).toHaveBeenCalledWith({
        where: { id: 'cluster-1' },
        data: { name: 'Updated', desc: 'Updated desc' },
        include: expect.any(Object),
      });
    });
  });

  // ─── updateClusterAccountNumber ──────────────────────────
  describe('updateClusterAccountNumber', () => {
    it('should update the account number', async () => {
      mockClusterFound();
      mockPrisma.cluster.update.mockResolvedValue({
        ...mockCluster,
        accountNumber: '0987654321',
      });
      mockPrisma.member.findMany.mockResolvedValue(mockOrgMembers);

      const result = await service.updateClusterAccountNumber('cluster-1', {
        accountNumber: '0987654321',
      });
      expect(result.accountNumber).toBe('0987654321');
    });

    it('should throw on empty account number', async () => {
      mockClusterFound();
      await expect(
        service.updateClusterAccountNumber('cluster-1', { accountNumber: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── payFromAccount ──────────────────────────────────────
  describe('payFromAccount', () => {
    const payDto = {
      userId: 'user-1',
      amount: 10000,
    };

    it('should deduct from user and credit cluster', async () => {
      mockClusterFound();
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.cluster.update.mockResolvedValue({
        ...mockCluster,
        accountBalance: 10000,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({});

      const result = await service.payFromAccount('cluster-1', payDto);
      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { accountBalance: { decrement: 10000 } },
      });
    });

    it('should throw if user not found', async () => {
      mockClusterFound();
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.payFromAccount('cluster-1', payDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if insufficient balance', async () => {
      mockClusterFound();
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      await expect(
        service.payFromAccount('cluster-1', { ...payDto, amount: 999999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if pin is required but not provided', async () => {
      mockClusterFound();
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        pinSet: true,
      });
      await expect(
        service.payFromAccount('cluster-1', payDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should verify pin when user has pinSet and pin is provided', async () => {
      mockClusterFound();
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        pinSet: true,
      });
      mockPinService.verifyPin.mockResolvedValue({ success: true });
      mockPrisma.cluster.update.mockResolvedValue({
        ...mockCluster,
        accountBalance: 10000,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({});

      const result = await service.payFromAccount('cluster-1', {
        ...payDto,
        pin: '1234',
      });
      expect(result.success).toBe(true);
      expect(mockPinService.verifyPin).toHaveBeenCalledWith('user-1', '1234');
    });
  });

  // ─── createPendingTransaction ────────────────────────────
  describe('createPendingTransaction', () => {
    it('should create a pending transaction with 24h expiry', async () => {
      mockClusterFound();
      const dto = { userId: 'user-1', amount: 50000 };
      mockPrisma.pendingTransaction.create.mockResolvedValue({
        id: 'pt-1',
        ...dto,
        clusterId: 'cluster-1',
        status: 'pending',
        expiresAt: new Date(),
      });

      const result = await service.createPendingTransaction('cluster-1', dto);
      expect(result.clusterId).toBe('cluster-1');
      expect(result.status).toBe('pending');
      expect(mockPrisma.pendingTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          clusterId: 'cluster-1',
          amount: 50000,
          status: 'pending',
        }),
      });
    });
  });

  // ─── findMatchingPendingTransaction ──────────────────────
  describe('findMatchingPendingTransaction', () => {
    const pendingTxns = [
      { id: 'pt-1', amount: 50000, status: 'pending', createdAt: new Date() },
      { id: 'pt-2', amount: 75000, status: 'pending', createdAt: new Date() },
    ];

    it('should return exact match within tolerance', async () => {
      mockPrisma.pendingTransaction.findMany.mockResolvedValue(pendingTxns);
      const result = await service.findMatchingPendingTransaction(
        'cluster-1',
        500, // ₦500 = 50000 kobo
      );
      expect(result?.id).toBe('pt-1');
    });

    it('should return match within 5% tolerance', async () => {
      mockPrisma.pendingTransaction.findMany.mockResolvedValue(pendingTxns);
      const result = await service.findMatchingPendingTransaction(
        'cluster-1',
        512, // ₦512 = 51200 kobo, within 5% of 50000
      );
      expect(result?.id).toBe('pt-1');
    });

    it('should return most recent candidate when no amount match', async () => {
      mockPrisma.pendingTransaction.findMany.mockResolvedValue(pendingTxns);
      const result = await service.findMatchingPendingTransaction(
        'cluster-1',
        1, // ₦1 = 100 kobo, far from both
      );
      expect(result).toBeDefined();
    });

    it('should return null when no pending transactions exist', async () => {
      mockPrisma.pendingTransaction.findMany.mockResolvedValue([]);
      const result = await service.findMatchingPendingTransaction(
        'cluster-1',
        500,
      );
      expect(result).toBeNull();
    });
  });

  // ─── addClusterMember ────────────────────────────────────
  describe('addClusterMember', () => {
    it('should upsert cluster member and org member', async () => {
      mockClusterFound();
      mockUsersExist(['user-3']);
      mockPrisma.clusterMember.upsert.mockResolvedValue({
        id: 'cm-new',
        userId: 'user-3',
        clusterId: 'cluster-1',
        user: { id: 'user-3', name: 'New User' },
      });
      mockPrisma.member.upsert.mockResolvedValue({});

      const result = await service.addClusterMember('cluster-1', 'user-3');
      expect(result.userId).toBe('user-3');
      expect(mockPrisma.member.upsert).toHaveBeenCalled();
    });
  });

  // ─── removeClusterMember ─────────────────────────────────
  describe('removeClusterMember', () => {
    it('should remove plan members, org member, and cluster member', async () => {
      mockPrisma.clusterMember.findUnique.mockResolvedValue({
        id: 'cm-1',
        clusterId: 'cluster-1',
        userId: 'user-2',
      });
      mockPrisma.planMember.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.member.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.clusterMember.delete.mockResolvedValue({
        id: 'cm-1',
        userId: 'user-2',
        user: { id: 'user-2' },
      });

      const result = await service.removeClusterMember('cluster-1', 'user-2');
      expect(result.userId).toBe('user-2');
    });

    it('should throw when cluster member not found', async () => {
      mockPrisma.clusterMember.findUnique.mockResolvedValue(null);
      await expect(
        service.removeClusterMember('cluster-1', 'nobody'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createPlan ──────────────────────────────────────────
  describe('createPlan', () => {
    const planDto = {
      name: 'New Plan',
      desc: 'Plan desc',
      memberIds: ['user-1', 'user-2'],
    };

    it('should create a plan and upsert cluster members', async () => {
      mockClusterFound();
      mockUsersExist(['user-1', 'user-2']);
      mockPrisma.clusterMember.upsert.mockResolvedValue({});
      mockPrisma.plan.create.mockResolvedValue({
        ...mockPlan,
        name: 'New Plan',
        desc: 'Plan desc',
        members: [
          { userId: 'user-1', user: { id: 'user-1' } },
          { userId: 'user-2', user: { id: 'user-2' } },
        ],
        transactions: [],
      });

      const result = await service.createPlan('cluster-1', planDto);
      expect(result.name).toBe('New Plan');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── findPlans ───────────────────────────────────────────
  describe('findPlans', () => {
    it('should return all plans for a cluster', async () => {
      mockClusterFound();
      mockPrisma.plan.findMany.mockResolvedValue([mockPlan]);
      const result = await service.findPlans('cluster-1');
      expect(result).toEqual([mockPlan]);
    });
  });

  // ─── findPlan ────────────────────────────────────────────
  describe('findPlan', () => {
    it('should return plan when found in cluster', async () => {
      mockPrisma.plan.findFirst.mockResolvedValue(mockPlan);
      const result = await service.findPlan('cluster-1', 'plan-1');
      expect(result).toEqual(mockPlan);
    });

    it('should throw when plan not in cluster', async () => {
      mockPrisma.plan.findFirst.mockResolvedValue(null);
      await expect(
        service.findPlan('cluster-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deletePlan ──────────────────────────────────────────
  describe('deletePlan', () => {
    it('should delete plan when it exists in cluster', async () => {
      mockPrisma.plan.findFirst.mockResolvedValue({ id: 'plan-1' });
      mockPrisma.plan.delete.mockResolvedValue(mockPlan);

      const result = await service.deletePlan('cluster-1', 'plan-1');
      expect(result).toEqual(mockPlan);
    });

    it('should throw when plan not in cluster', async () => {
      mockPrisma.plan.findFirst.mockResolvedValue(null);
      await expect(
        service.deletePlan('cluster-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updatePlan ──────────────────────────────────────────
  describe('updatePlan', () => {
    it('should update plan fields', async () => {
      mockPrisma.plan.findFirst.mockResolvedValue({ id: 'plan-1' });
      mockPrisma.plan.update.mockResolvedValue({
        ...mockPlan,
        name: 'Updated Plan',
        desc: 'Updated desc',
        minimumContribution: '5000',
      });

      const result = await service.updatePlan('cluster-1', 'plan-1', {
        name: 'Updated Plan',
        desc: 'Updated desc',
        minimumContribution: '5000',
      });
      expect(result.name).toBe('Updated Plan');
      expect(result.minimumContribution).toBe('5000');
    });
  });

  // ─── addPlanMember ───────────────────────────────────────
  describe('addPlanMember', () => {
    it('should upsert cluster member and plan member', async () => {
      mockPrisma.plan.findFirst.mockResolvedValue({ id: 'plan-1' });
      mockUsersExist(['user-3']);

      mockPrisma.clusterMember.upsert.mockResolvedValue({});
      mockPrisma.planMember.upsert.mockResolvedValue({
        id: 'pm-new',
        userId: 'user-3',
        planId: 'plan-1',
        user: { id: 'user-3' },
      });

      const result = await service.addPlanMember('cluster-1', 'plan-1', 'user-3');
      expect(result.userId).toBe('user-3');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── removePlanMember ────────────────────────────────────
  describe('removePlanMember', () => {
    it('should delete plan member when it exists', async () => {
      mockPrisma.planMember.findFirst.mockResolvedValue({ id: 'pm-1' });
      mockPrisma.planMember.delete.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        user: { id: 'user-1' },
      });

      const result = await service.removePlanMember(
        'cluster-1',
        'plan-1',
        'user-1',
      );
      expect(result.userId).toBe('user-1');
    });

    it('should throw when plan member not found', async () => {
      mockPrisma.planMember.findFirst.mockResolvedValue(null);
      await expect(
        service.removePlanMember('cluster-1', 'plan-1', 'nobody'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findUserPlans ───────────────────────────────────────
  describe('findUserPlans', () => {
    it('should return plans for a user with counts', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockPrisma.planMember.findMany.mockResolvedValue([
        {
          joinedAt: new Date(),
          plan: {
            id: 'plan-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            cluster: { id: 'cluster-1', accountNumber: '1234567890' },
            _count: { members: 3, transactions: 5 },
          },
        },
      ]);

      const result = await service.findUserPlans('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('plan-1');
      expect(result[0].memberCount).toBe(3);
      expect(result[0].transactionCount).toBe(5);
    });
  });

  // ─── requestVirtualAccountNumber ─────────────────────────
  describe('requestVirtualAccountNumber', () => {
    it('should request VA via squad and update cluster', async () => {
      mockClusterFound();
      mockSquadService.virtualAccount.mockResolvedValue({
        data: { virtual_account_number: 'VA12345' },
      });
      mockPrisma.cluster.update.mockResolvedValue({
        ...mockCluster,
        accountNumber: 'VA12345',
      });
      mockPrisma.member.findMany.mockResolvedValue(mockOrgMembers);

      const dto = {
        customer_identifier: 'test',
        first_name: 'Test',
        last_name: 'User',
        mobile_num: '08000000000',
        email: 'test@test.com',
        bvn: '12345678901',
        dob: '1990-01-01',
        address: '123 Street',
        gender: 'male',
        beneficiary_account: '1234567890',
      };
      const result = await service.requestVirtualAccountNumber('cluster-1', dto);
      expect(result.accountNumber).toBe('VA12345');
    });
  });
});
