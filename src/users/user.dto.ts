import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({
    description: 'ID of the user sending the funds',
    example: 'user_abc123',
  })
  @IsNotEmpty()
  @IsString()
  senderId: string;

  @ApiProperty({
    description: 'ID of the user receiving the funds',
    example: 'user_def456',
  })
  @IsNotEmpty()
  @IsString()
  recipientId: string;

  @ApiProperty({
    description: 'Amount to transfer in kobo (e.g., 50000 = ₦500)',
    example: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: '4-digit PIN for verification (required if PIN is set)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  pin?: string;
}
