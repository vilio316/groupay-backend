import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SquadService } from '../squad/squad.service';

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly squad: SquadService,
  ) {}

  getAllTxns() {
    return this.prisma.transaction.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
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

  //   imaginary(){
  //     return this.prisma.transaction.fin
  //   }
}
