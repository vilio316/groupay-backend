import { Get, Controller, Param, Query } from '@nestjs/common';
import { TransactionService } from './transactions.service';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions for a user', description: 'Retrieves all transactions where the user is the sender or recipient. If no userId is provided, returns all transactions.' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter transactions where this user is sender or recipient', example: 'user_abc123' })
  @ApiResponse({ status: 200, description: 'Transactions returned successfully' })
  allTrxes(@Query('userId') userId?: string) {
    return this.transactions.getAllTxns(userId);
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
