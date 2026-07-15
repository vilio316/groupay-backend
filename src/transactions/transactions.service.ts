import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllTxns(userId?: string) {
    const where = userId
      ? {
          OR: [
            { senderId: userId },
            { recipientId: userId },
          ],
        }
      : {};

    const txns = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (!userId) return txns;

    return txns.map((txn) => ({
      ...txn,
      direction:
        txn.recipientId === userId ? 'inbound' : 'outbound',
    }));
  }

  async getTrx(ref: string) {
    const fromTxnTable = await this.prisma.transaction.findUnique({
      where: { transactionRef: ref },
    });
    const fromWebhookEvent = await this.prisma.webhookEvent.findFirst({
      where: { transactionReference: ref },
    });

    return {
      ...fromTxnTable,
      sender:
        fromWebhookEvent?.rawPayload && fromWebhookEvent.rawPayload['Body']
          ? fromWebhookEvent.rawPayload['Body'].email
          : 'unavailable',
    };
  }
}
