import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  getAllTxns() {
    return this.prisma.transaction.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  getTrx(ref: string) {
    return this.prisma.transaction.findUnique({
      where: { transactionRef: ref },
    });
  }

  //   imaginary(){
  //     return this.prisma.transaction.fin
  //   }
}
