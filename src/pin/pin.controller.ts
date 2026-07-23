import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PinService } from './pin.service';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

class SetPinDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  pin: string;
}

class ChangePinDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  currentPin: string;

  @IsString()
  @IsNotEmpty()
  newPin: string;
}

class VerifyPinDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  pin: string;
}

@ApiTags('PIN')
@Controller('pin')
export class PinController {
  constructor(private readonly pinService: PinService) {}

  @Post('set')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Set a new PIN',
    description: 'Sets a 4-digit PIN for the user.',
  })
  @ApiBody({
    description: 'User ID and new PIN',
    schema: { example: { userId: 'user_abc123', pin: '1234' } },
  })
  @ApiResponse({ status: 201, description: 'PIN set successfully' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Try again later.' })
  setPin(@Body() body: SetPinDto) {
    return this.pinService.setPin(body.userId, body.pin);
  }

  @Post('change')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Change existing PIN',
    description: 'Changes the user PIN by verifying the current one first.',
  })
  @ApiBody({
    description: 'User ID, current PIN, and new PIN',
    schema: {
      example: { userId: 'user_abc123', currentPin: '1234', newPin: '5678' },
    },
  })
  @ApiResponse({ status: 200, description: 'PIN changed successfully' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Try again later.' })
  changePin(@Body() body: ChangePinDto) {
    return this.pinService.changePin(body.userId, body.currentPin, body.newPin);
  }

  @Post('verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verify a PIN',
    description: "Verifies a user's 4-digit PIN.",
  })
  @ApiBody({
    description: 'User ID and PIN to verify',
    schema: { example: { userId: 'user_abc123', pin: '1234' } },
  })
  @ApiResponse({ status: 200, description: 'PIN verified successfully' })
  @ApiResponse({ status: 403, description: 'Incorrect PIN' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Try again later.' })
  verifyPin(@Body() body: VerifyPinDto) {
    return this.pinService.verifyPin(body.userId, body.pin);
  }

  @Get('status/:userId')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Check PIN status',
    description: 'Checks if the user has set a PIN.',
  })
  @ApiParam({
    name: 'userId',
    description: 'The user ID',
    example: 'user_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN status returned',
    schema: { example: { hasPin: true } },
  })
  checkStatus(@Param('userId') userId: string) {
    return this.pinService.checkPinStatus(userId);
  }
}
