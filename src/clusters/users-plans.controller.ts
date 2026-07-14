import { Controller, Get, Param } from '@nestjs/common';
import { ClustersService } from './clusters.service';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users')
@OptionalAuth()
@Controller('users')
export class UsersPlansController {
  constructor(private readonly clustersService: ClustersService) {}

  @Get(':userId/plans')
  @ApiOperation({ summary: "Get user's plans", description: 'Retrieves all plans that a specific user has joined across all clusters.' })
  @ApiParam({ name: 'userId', description: 'The user ID', example: 'user_abc123' })
  @ApiResponse({ status: 200, description: 'User plans returned successfully' })
  findUserPlans(@Param('userId') userId: string) {
    return this.clustersService.findUserPlans(userId);
  }
}
