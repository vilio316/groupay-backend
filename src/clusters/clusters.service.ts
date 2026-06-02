import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateClusterDto = {
  accountNumber?: string;
  memberIds?: string[];
  name?: string;
  desc?: string;
};

type CreatePlanDto = {
  memberIds?: string[];
  name?: string;
  desc?: string;
};

type UpdateClusterAccountDto = {
  accountNumber: string;
};

type ClusterTransaction = Pick<
  PrismaService,
  'clusterMember' | 'plan' | 'planMember'
>;

@Injectable()
export class ClustersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCluster({ memberIds = [], name, desc }: CreateClusterDto) {
    const uniqueMemberIds = this.uniqueIds(memberIds);
    await this.assertUsersExist(uniqueMemberIds);

    return this.prisma.cluster.create({
      data: {
        name: name,
        desc: desc,
        accountNumber: '',
        members: {
          create: uniqueMemberIds.map((userId) => ({
            user: { connect: { id: userId } },
          })),
        },
      },
      include: this.clusterInclude(),
    });
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

    return cluster;
  }

  async deleteCluster(clusterId: string) {
    await this.assertClusterExists(clusterId);

    return this.prisma.cluster.delete({
      where: { id: clusterId },
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

  async addClusterMember(clusterId: string, userId: string) {
    await this.assertClusterExists(clusterId);
    await this.assertUsersExist([userId]);

    return this.prisma.clusterMember.upsert({
      where: { userId_clusterId: { userId, clusterId } },
      update: {},
      create: {
        cluster: { connect: { id: clusterId } },
        user: { connect: { id: userId } },
      },
      include: { user: true },
    });
  }

  async removeClusterMember(clusterId: string, userId: string) {
    await this.assertClusterMemberExists(clusterId, userId);

    await this.prisma.planMember.deleteMany({
      where: {
        userId,
        plan: { clusterId },
      },
    });

    return this.prisma.clusterMember.delete({
      where: { userId_clusterId: { userId, clusterId } },
      include: { user: true },
    });
  }

  async createPlan(clusterId: string, { memberIds = [] }: CreatePlanDto) {
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
