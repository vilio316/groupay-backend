import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ClustersService } from './clusters.service';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';

type CreateClusterBody = {
  accountNumber?: string;
  memberIds?: string[];
};

type CreatePlanBody = {
  memberIds?: string[];
};

type MemberBody = {
  userId: string;
};

type UpdateClusterAccountBody = {
  accountNumber: string;
};

@OptionalAuth()
@Controller('clusters')
export class ClustersController {
  constructor(private readonly clustersService: ClustersService) {}

  @Post()
  createCluster(@Body() body: CreateClusterBody) {
    return this.clustersService.createCluster(body);
  }

  @Get()
  findClusters() {
    return this.clustersService.findClusters();
  }

  @Get(':clusterId')
  findCluster(@Param('clusterId') clusterId: string) {
    return this.clustersService.findCluster(clusterId);
  }

  @Delete(':clusterId')
  deleteCluster(@Param('clusterId') clusterId: string) {
    return this.clustersService.deleteCluster(clusterId);
  }

  @Patch(':clusterId/account-number')
  updateClusterAccountNumber(
    @Param('clusterId') clusterId: string,
    @Body() body: UpdateClusterAccountBody,
  ) {
    return this.clustersService.updateClusterAccountNumber(clusterId, body);
  }

  @Post(':clusterId/members')
  addClusterMember(
    @Param('clusterId') clusterId: string,
    @Body() body: MemberBody,
  ) {
    return this.clustersService.addClusterMember(clusterId, body.userId);
  }

  @Delete(':clusterId/members/:userId')
  removeClusterMember(
    @Param('clusterId') clusterId: string,
    @Param('userId') userId: string,
  ) {
    return this.clustersService.removeClusterMember(clusterId, userId);
  }

  @Post(':clusterId/plans')
  createPlan(
    @Param('clusterId') clusterId: string,
    @Body() body: CreatePlanBody,
  ) {
    return this.clustersService.createPlan(clusterId, body);
  }

  @Get(':clusterId/plans')
  findPlans(@Param('clusterId') clusterId: string) {
    return this.clustersService.findPlans(clusterId);
  }

  @Get(':clusterId/plans/:planId')
  findPlan(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
  ) {
    return this.clustersService.findPlan(clusterId, planId);
  }

  @Delete(':clusterId/plans/:planId')
  deletePlan(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
  ) {
    return this.clustersService.deletePlan(clusterId, planId);
  }

  @Post(':clusterId/plans/:planId/members')
  addPlanMember(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
    @Body() body: MemberBody,
  ) {
    return this.clustersService.addPlanMember(clusterId, planId, body.userId);
  }

  @Delete(':clusterId/plans/:planId/members/:userId')
  removePlanMember(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
    @Param('userId') userId: string,
  ) {
    return this.clustersService.removePlanMember(clusterId, planId, userId);
  }
}
