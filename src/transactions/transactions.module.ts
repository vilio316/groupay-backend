import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  providers: [PrismaService, TransactionService],
  exports: [],
  imports: [],
  controllers: [TransactionsController],
})
export class TransactionModule {}
