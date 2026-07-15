import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
