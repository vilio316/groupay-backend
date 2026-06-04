import { Controller, Get, Param } from '@nestjs/common';
import { ClustersService } from './clusters.service';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';

@OptionalAuth()
@Controller('users')
export class UsersPlansController {
  constructor(private readonly clustersService: ClustersService) {}

  @Get(':userId/plans')
  findUserPlans(@Param('userId') userId: string) {
    return this.clustersService.findUserPlans(userId);
  }
}
