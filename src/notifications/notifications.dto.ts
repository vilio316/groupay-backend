import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({
    description: 'ID of the user sending the notification',
    example: 'user_abc123',
  })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({
    description: 'ID of the user receiving the notification',
    example: 'user_def456',
  })
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({
    description: 'The notification message content',
    example: 'John joined your plan "Vacation Fund"',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Type/category of the notification',
    example: 'join',
  })
  @IsString()
  @IsNotEmpty()
  type: string;
}
