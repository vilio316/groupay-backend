import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClusterDto {
  @ApiPropertyOptional({
    description: 'Optional pre-assigned account number for the cluster',
    example: '1234567890',
  })
  accountNumber?: string;

  @ApiProperty({
    description: 'Array of user IDs to add as initial members',
    example: ['user_abc123', 'user_def456'],
  })
  @IsNotEmpty()
  memberIds: string[];

  @ApiProperty({
    description: 'Name of the cluster',
    example: 'Monthly Savings Group',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description or purpose of the cluster',
    example: 'A group for our monthly contribution savings',
  })
  desc?: string;
}

export class CreatePlanDto {
  @ApiProperty({
    description: 'Array of user IDs to add as members of the plan',
    example: ['user_abc123', 'user_def456'],
  })
  @IsNotEmpty()
  memberIds: string[];

  @ApiProperty({
    description: 'Name of the savings plan',
    example: 'Vacation Fund 2026',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Detailed description of the plan',
    example: 'Monthly contributions towards our end-of-year vacation',
  })
  @IsString()
  @IsNotEmpty()
  desc: string;
}

export class EditPlanDto {
  @ApiPropertyOptional({
    description: 'Updated plan name',
    example: 'Vacation Fund 2026 (Updated)',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated plan description',
    example: 'Bi-weekly contributions instead of monthly',
  })
  desc?: string;

  @ApiPropertyOptional({
    description: 'Minimum contribution amount per cycle',
    example: '25000',
  })
  minimumContribution?: string;
}

export class UpdateClusterAccountDto {
  @ApiProperty({
    description: 'New account number for the cluster',
    example: '0987654321',
  })
  accountNumber: string;
}

export class MemberBody {
  @ApiProperty({
    description: 'User ID to add or remove as a member',
    example: 'user_abc123',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class CreatePendingTransactionDto {
  @ApiProperty({
    description: 'ID of the user initiating the transfer',
    example: 'user_abc123',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Amount the user stated they sent (in kobo)',
    example: 500000,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Plan ID this payment is for (optional)',
    example: 'plan-uuid-here',
  })
  @IsOptional()
  @IsString()
  planId?: string;
}

export class PayFromAccountDto {
  @ApiProperty({
    description: 'ID of the user making the payment',
    example: 'user_abc123',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Amount to pay from the user account into the cluster',
    example: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Custom label for the transaction (defaults to "Cluster Funding")',
    example: 'Plan Contribution',
  })
  @IsOptional()
  @IsString()
  transactionHeading?: string;

  @ApiPropertyOptional({
    description: 'Plan ID to associate this payment with',
    example: 'plan-uuid-here',
  })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({
    description: '4-digit PIN for verification (required if PIN is set)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  pin?: string;
}
