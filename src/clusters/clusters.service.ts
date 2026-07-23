import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateClusterDto,
  CreatePlanDto,
  CreatePendingTransactionDto,
  EditPlanDto,
  PayFromAccountDto,
  UpdateClusterAccountDto,
} from './clusters.dto';
import { SquadService } from '../squad/squad.service';
import { PinService } from '../pin/pin.service';
import { VirtualAccountDto } from '../squad/dto/squad.dto';
import {
  SQUAD_MODULE_OPTIONS,
  SQUAD_SANDBOX_BASE_URL,
  SQUAD_PRODUCTION_BASE_URL,
} from '../squad/squad.config';
import type { SquadModuleOptions } from '../squad/squad.config';
import type { AxiosInstance } from 'axios';
import axios from 'axios';

type ClusterTransaction = Pick<
  PrismaService,
  'clusterMember' | 'plan' | 'planMember'
>;

@Injectable()
export class ClustersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly squad: SquadService,
    private readonly pinService: PinService,
  ) {
    // const baseURL = options.isProduction
    //   ? SQUAD_PRODUCTION_BASE_URL
    //   : SQUAD_SANDBOX_BASE_URL;
    // this.http = axios.create({
    //   baseURL,
    //   headers: {
    //     Authorization: `Bearer ${options.secretKey}`,
    //     'Content-Type': 'application/json',
    //   },
    // });
  }

  async createCluster(
    { memberIds = [], name, desc }: CreateClusterDto,
    creatorId?: string,
  ) {
    const allMemberIds = this.uniqueIds([
      ...memberIds,
      ...(creatorId ? [creatorId] : []),
    ]);
    await this.assertUsersExist(allMemberIds);

    const cluster = await this.prisma.cluster.create({
      data: {
        name: name,
        desc: desc,
        accountNumber: '',
        members: {
          create: allMemberIds.map((userId) => ({
            user: { connect: { id: userId } },
          })),
        },
      },
      include: this.clusterInclude(),
    });

    const now = new Date();
    await this.prisma.organization.create({
      data: {
        id: cluster.id,
        name: name || 'Untitled Cluster',
        slug: cluster.id,
        createdAt: now,
        members: {
          createMany: {
            data: allMemberIds.map((userId) => ({
              id: `${cluster.id}-${userId}`,
              userId,
              role: userId === creatorId ? 'owner' : 'member',
              createdAt: now,
            })),
          },
        },
      },
    });

    return this.attachMemberRoles(cluster, cluster.id);
  }

  findClusters() {
    return this.prisma.cluster.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findClustersByUser(userId: string) {
    return this.prisma.clusterMember.findMany({
      where: {
        userId: userId,
      },
    });
  }

  async findCluster(clusterId: string) {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
      include: this.clusterInclude(),
    });

    if (!cluster) {
      throw new NotFoundException('Cluster not found');
    }

    return this.attachMemberRoles(cluster, clusterId);
  }

  async deleteCluster(clusterId: string) {
    await this.assertClusterExists(clusterId);

    await this.prisma.member.deleteMany({
      where: { organizationId: clusterId },
    });
    await this.prisma.organization.deleteMany({
      where: { id: clusterId },
    });

    return this.prisma.cluster.delete({
      where: { id: clusterId },
    });
  }

  async requestVirtualAccountNumber(clusterId: string, dto: VirtualAccountDto) {
    await this.assertClusterExists(clusterId);

    const { data } = await this.squad.virtualAccount(dto);

    return this.prisma.cluster.update({
      data: {
        accountNumber: data.virtual_account_number,
      },
      where: { id: clusterId },
      include: this.clusterInclude(),
    });
  }

  async updateClusterDetails(
    clusterId: string,
    { name, desc }: Partial<CreateClusterDto>,
  ) {
    await this.assertClusterExists(clusterId);

    return this.prisma.cluster.update({
      data: {
        name: name,
        desc: desc,
      },
      where: { id: clusterId },
      include: this.clusterInclude(),
    });
  }

  async updateClusterAccountNumber(
    clusterId: string,
    { accountNumber }: UpdateClusterAccountDto,
  ) {
    await this.assertClusterExists(clusterId);

    if (!accountNumber?.trim()) {
      throw new BadRequestException('accountNumber is required');
    }

    return this.prisma.cluster.update({
      where: { id: clusterId },
      data: { accountNumber: accountNumber.trim() },
      include: this.clusterInclude(),
    });
  }

  async payFromAccount(
    clusterId: string,
    body: PayFromAccountDto,
  ) {
    const { userId, amount, planId, pin } = body;
    await this.assertClusterExists(clusterId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User account not found');
    }

    if (Number(user.accountBalance) < amount) {
      throw new BadRequestException('Insufficient account balance');
    }

    if (user.pinSet) {
      if (!pin) {
        throw new ForbiddenException('PIN is required for this transaction');
      }
      await this.pinService.verifyPin(userId, pin);
    }

    const cluster = await this.prisma.cluster.update({
      where: { id: clusterId },
      data: { accountBalance: { increment: amount } },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { accountBalance: { decrement: amount } },
    });

    const transactionRef = `GP-${userId.slice(0, 8)}-${Date.now()}`;

    await this.prisma.transaction.create({
      data: {
        transactionRef,
        transactionHeading: body.transactionHeading || 'Cluster Funding',
        type: 'outbound',
        senderId: userId,
        clusterId,
        planId: planId || undefined,
        amount,
        channel: 'groupay-account',
        status: 'Success',
      },
    });

    return { success: true, transactionRef, cluster };
  }

  async createPendingTransaction(
    clusterId: string,
    body: CreatePendingTransactionDto,
  ) {
    await this.assertClusterExists(clusterId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.prisma.pendingTransaction.create({
      data: {
        userId: body.userId,
        clusterId,
        planId: body.planId || undefined,
        amount: body.amount,
        expiresAt,
        status: 'pending',
      },
    });
  }

  async findMatchingPendingTransaction(
    clusterId: string,
    webhookAmountNaira: number,
  ) {
    const webhookAmountKobo = webhookAmountNaira * 100;
    const tolerance = 0.05;

    const candidates = await this.prisma.pendingTransaction.findMany({
      where: {
        clusterId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const matchByAmount = candidates.find((p) => {
      const diff = Math.abs(p.amount - webhookAmountKobo);
      return diff / p.amount <= tolerance;
    });

    return matchByAmount || candidates[0] || null;
  }

  async addClusterMember(clusterId: string, userId: string) {
    await this.assertClusterExists(clusterId);
    await this.assertUsersExist([userId]);

    const member = await this.prisma.clusterMember.upsert({
      where: { userId_clusterId: { userId, clusterId } },
      update: {},
      create: {
        cluster: { connect: { id: clusterId } },
        user: { connect: { id: userId } },
      },
      include: { user: true },
    });

    await this.prisma.member.upsert({
      where: { id: `${clusterId}-${userId}` },
      update: {},
      create: {
        id: `${clusterId}-${userId}`,
        organizationId: clusterId,
        userId,
        role: 'member',
        createdAt: new Date(),
      },
    });

    return member;
  }

  async removeClusterMember(clusterId: string, userId: string) {
    await this.assertClusterMemberExists(clusterId, userId);

    await this.prisma.planMember.deleteMany({
      where: {
        userId,
        plan: { clusterId },
      },
    });

    await this.prisma.member.deleteMany({
      where: { organizationId: clusterId, userId },
    });

    return this.prisma.clusterMember.delete({
      where: { userId_clusterId: { userId, clusterId } },
      include: { user: true },
    });
  }

  async createPlan(
    clusterId: string,
    { memberIds = [], name, desc }: CreatePlanDto,
  ) {
    await this.assertClusterExists(clusterId);

    const uniqueMemberIds = this.uniqueIds(memberIds);
    await this.assertUsersExist(uniqueMemberIds);

    return this.prisma.$transaction(async (tx) => {
      const clusterTx = tx as unknown as ClusterTransaction;

      await Promise.all(
        uniqueMemberIds.map((userId) =>
          clusterTx.clusterMember.upsert({
            where: { userId_clusterId: { userId, clusterId } },
            update: {},
            create: {
              cluster: { connect: { id: clusterId } },
              user: { connect: { id: userId } },
            },
          }),
        ),
      );

      return clusterTx.plan.create({
        data: {
          name: name,
          desc: desc,
          cluster: { connect: { id: clusterId } },
          members: {
            create: uniqueMemberIds.map((userId) => ({
              user: { connect: { id: userId } },
            })),
          },
        },
        include: this.planInclude(),
      });
    });
  }

  async findPlans(clusterId: string) {
    await this.assertClusterExists(clusterId);

    return this.prisma.plan.findMany({
      where: { clusterId },
      orderBy: { createdAt: 'desc' },
      include: this.planInclude(),
    });
  }

  async findPlan(clusterId: string, planId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, clusterId },
      include: this.planInclude(),
    });

    if (!plan) {
      throw new NotFoundException('Plan not found in this cluster');
    }

    return plan;
  }

  async deletePlan(clusterId: string, planId: string) {
    await this.assertPlanInCluster(clusterId, planId);

    return this.prisma.plan.delete({
      where: { id: planId },
    });
  }

  async updatePlan(
    clusterId: string,
    planId: string,
    { name, desc, minimumContribution }: EditPlanDto,
  ) {
    await this.assertPlanInCluster(clusterId, planId);

    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        name: name,
        desc: desc,
        minimumContribution: minimumContribution,
      },
      include: this.planInclude(),
    });
  }

  async addPlanMember(clusterId: string, planId: string, userId: string) {
    await this.assertPlanInCluster(clusterId, planId);
    await this.assertUsersExist([userId]);

    return this.prisma.$transaction(async (tx) => {
      const clusterTx = tx as unknown as ClusterTransaction;

      await clusterTx.clusterMember.upsert({
        where: { userId_clusterId: { userId, clusterId } },
        update: {},
        create: {
          cluster: { connect: { id: clusterId } },
          user: { connect: { id: userId } },
        },
      });

      return clusterTx.planMember.upsert({
        where: { userId_planId: { userId, planId } },
        update: {},
        create: {
          plan: { connect: { id: planId } },
          user: { connect: { id: userId } },
        },
        include: { user: true },
      });
    });
  }

  async removePlanMember(clusterId: string, planId: string, userId: string) {
    await this.assertPlanMemberExists(clusterId, planId, userId);

    return this.prisma.planMember.delete({
      where: { userId_planId: { userId, planId } },
      include: { user: true },
    });
  }

  async findUserPlans(userId: string) {
    await this.assertUsersExist([userId]);

    const memberships = await this.prisma.planMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      select: {
        joinedAt: true,
        plan: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            cluster: {
              select: {
                id: true,
                accountNumber: true,
              },
            },
            _count: {
              select: {
                members: true,
                transactions: true,
              },
            },
          },
        },
      },
    });

    return memberships.map(({ joinedAt, plan }) => ({
      id: plan.id,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      joinedAt,
      cluster: plan.cluster,
      memberCount: plan._count.members,
      transactionCount: plan._count.transactions,
    }));
  }

  private async attachMemberRoles(cluster: any, clusterId: string) {
    const orgMembers = await this.prisma.member.findMany({
      where: { organizationId: clusterId },
      select: { userId: true, role: true },
    });
    const roleMap = new Map(orgMembers.map((m) => [m.userId, m.role]));
    return {
      ...cluster,
      members: cluster.members.map((m: any) => ({
        ...m,
        role: roleMap.get(m.userId) || 'member',
      })),
    };
  }

  private uniqueIds(ids: string[]) {
    return [...new Set(ids.filter(Boolean))];
  }

  private async assertUsersExist(userIds: string[]) {
    if (userIds.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    if (users.length !== userIds.length) {
      const foundIds = new Set(users.map((user) => user.id));
      const missingIds = userIds.filter((userId) => !foundIds.has(userId));

      throw new NotFoundException(
        `User(s) not found: ${missingIds.join(', ')}`,
      );
    }
  }

  private async assertClusterExists(clusterId: string) {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
      select: { id: true },
    });

    if (!cluster) {
      throw new NotFoundException('Cluster not found');
    }
  }

  private async assertPlanInCluster(clusterId: string, planId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, clusterId },
      select: { id: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found in this cluster');
    }
  }

  private async assertClusterMemberExists(clusterId: string, userId: string) {
    const member = await this.prisma.clusterMember.findUnique({
      where: { userId_clusterId: { userId, clusterId } },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Cluster member not found');
    }
  }

  private async assertPlanMemberExists(
    clusterId: string,
    planId: string,
    userId: string,
  ) {
    const member = await this.prisma.planMember.findFirst({
      where: { userId, planId, plan: { clusterId } },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Plan member not found');
    }
  }

  private clusterInclude() {
    return {
      members: {
        include: { user: true },
        orderBy: { joinedAt: 'asc' as const },
      },
      plans: {
        include: this.planInclude(),
        orderBy: { createdAt: 'desc' as const },
      },
      transactions: true,
    };
  }

  private planInclude() {
    return {
      members: {
        include: { user: true },
        orderBy: { joinedAt: 'asc' as const },
      },
      transactions: true,
    };
  }
}
