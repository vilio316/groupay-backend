import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InitiatePaymentDto } from '../squad/dto/squad.dto';
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
        fromWebhookEvent?.rawPayload &&
        fromWebhookEvent.rawPayload['Body'].email,
    };
  }

  async handleTrx(dto: InitiatePaymentDto, clusterId: string) {
    const paymentReq = await this.squad.initiatePayment({
      ...dto,
      metadata: {
        clusterId,
      },
    });
  }

  //   imaginary(){
  //     return this.prisma.transaction.fin
  //   }
}
