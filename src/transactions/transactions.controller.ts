import { Get, Controller, Param } from '@nestjs/common';
import { TransactionService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  allTrxes() {
    return this.transactions.getAllTxns();
  }

  @Get(':ref')
  fetchTrx(@Param('ref') ref: string) {
    return this.transactions.getTrx(ref);
  }
}
