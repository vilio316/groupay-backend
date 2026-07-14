import { Get, Controller, Param } from '@nestjs/common';
import { TransactionService } from './transactions.service';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'List all transactions', description: 'Retrieves all transactions across the entire platform.' })
  @ApiResponse({ status: 200, description: 'Transactions returned successfully' })
  allTrxes() {
    return this.transactions.getAllTxns();
  }

  @Get(':ref')
  @ApiOperation({ summary: 'Get transaction by reference', description: 'Retrieves a single transaction by its unique reference string.' })
  @ApiParam({ name: 'ref', description: 'The transaction reference', example: 'TXN_1712345678' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  fetchTrx(@Param('ref') ref: string) {
    return this.transactions.getTrx(ref);
  }
}
