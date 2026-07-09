import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  getUsers() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  fetchUser(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  }

  async getUserById(id: string) {
    const userData = await this.prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    const clusters = await this.prisma.clusterMember.findMany({
      where: {
        userId: id,
      },
    });
    return {
      ...userData,
      clusters: clusters,
    };
  }

  getUsersByValue(email: string) {
    return this.prisma.user.findMany({
      where: {
        email: email,
      },
    });
  }

  getUserAccount(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        accountBalance: true,
        accountNumber: true,
      },
    });
  }
}
