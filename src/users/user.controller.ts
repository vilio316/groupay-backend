import { Get, Post, Body, Controller, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { TransferDto } from './user.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('userData')
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieves user profile data by querying with their user ID.' })
  @ApiQuery({ name: 'id', description: 'The user ID', example: 'user_abc123' })
  @ApiResponse({ status: 200, description: 'User found', schema: { example: { id: 'user_abc123', name: 'John Doe', email: 'john@example.com', image: null } } })
  @ApiResponse({ status: 404, description: 'User not found' })
  fetchById(@Query('id') id: string) {
    return this.user.getUserById(id);
  }

  @Get(':email')
  @ApiOperation({ summary: 'Get user by email', description: 'Retrieves a user profile by their email address.' })
  @ApiParam({ name: 'email', description: 'The user email address', example: 'john@example.com' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  fetchUser(@Param('email') email: string) {
    return this.user.fetchUser(email);
  }

  @Get('/query/:email')
  @ApiOperation({ summary: 'Search users by email', description: 'Searches for users whose email matches the given query string (partial match).' })
  @ApiParam({ name: 'email', description: 'Email or partial email to search for', example: 'john' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  fetchQueryResults(@Param('email') email: string) {
    return this.user.getUsersByValue(email);
  }

  @Get('/account/:userId')
  @ApiOperation({ summary: "Get user's account", description: "Retrieves the user's GrouPay account details including account number and balance." })
  @ApiParam({ name: 'userId', description: 'The user ID', example: 'user_abc123' })
  @ApiResponse({ status: 200, description: 'Account details returned', schema: { example: { id: 'acct_abc123', accountNumber: '1234567890', accountBalance: 100000 } } })
  fetchUserAccount(@Param('userId') userId: string) {
    return this.user.getUserAccount(userId);
  }

  @Post('/transfer')
  @ApiOperation({ summary: 'Transfer funds between users', description: 'Transfers funds from one user\'s GrouPay wallet to another user\'s wallet. No additional charges applied.' })
  @ApiBody({ type: TransferDto, description: 'Sender ID, recipient ID, and amount to transfer' })
  @ApiResponse({ status: 201, description: 'Transfer successful' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid request' })
  transferFunds(@Body() body: TransferDto) {
    return this.user.transferFunds(body);
  }
}
