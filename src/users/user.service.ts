import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferDto } from './user.dto';

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

  async transferFunds({ senderId, recipientId, amount }: TransferDto) {
    if (senderId === recipientId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than zero');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      throw new BadRequestException('Sender account not found');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new BadRequestException('Recipient account not found');
    }

    if (Number(sender.accountBalance || 0) < amount) {
      throw new BadRequestException('Insufficient account balance');
    }

    await this.prisma.user.update({
      where: { id: senderId },
      data: { accountBalance: { decrement: amount } },
    });

    await this.prisma.user.update({
      where: { id: recipientId },
      data: { accountBalance: { increment: amount } },
    });

    const transactionRef = `GP-${senderId.slice(0, 8)}-${Date.now()}`;

    const transaction = await this.prisma.transaction.create({
      data: {
        transactionRef,
        transactionHeading: 'Wallet Transfer',
        type: 'outbound',
        senderId,
        recipientId,
        amount,
        channel: 'groupay-wallet',
        status: 'Success',
      },
    });

    return { success: true, transactionRef, transaction };
  }
}
