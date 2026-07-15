import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateClusterDto,
  CreatePlanDto,
  CreatePendingTransactionDto,
  EditPlanDto,
  MemberBody,
  PayFromAccountDto,
} from './clusters.dto';
import { ClustersService } from './clusters.service';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { VirtualAccountDto } from '../squad/dto/squad.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';

type UpdateClusterAccountBody = {
  accountNumber: string;
};

@ApiTags('Clusters')
@OptionalAuth()
@Controller('clusters')
export class ClustersController {
  constructor(private readonly clustersService: ClustersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cluster', description: 'Creates a savings cluster with the given name, description, and initial members.' })
  @ApiBody({ type: CreateClusterDto, description: 'Cluster creation payload' })
  @ApiResponse({ status: 201, description: 'Cluster created successfully', schema: { example: { id: 'clust_abc123', name: 'Monthly Savings Group', createdAt: '2026-03-15T10:30:00Z' } } })
  createCluster(@Body() body: CreateClusterDto) {
    return this.clustersService.createCluster(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all clusters', description: 'Retrieves all clusters in the system.' })
  @ApiResponse({ status: 200, description: 'List of clusters returned successfully' })
  findClusters() {
    return this.clustersService.findClusters();
  }

  @Post('myClusters')
  @ApiOperation({ summary: "Get user's clusters", description: 'Retrieves all clusters a specific user belongs to.' })
  @ApiBody({ description: 'User ID payload', schema: { example: { userId: 'user_abc123' } } })
  @ApiResponse({ status: 200, description: 'User clusters returned successfully' })
  myCluster(@Body() body: { userId: string }) {
    return this.clustersService.findClustersByUser(body.userId);
  }

  @Get(':clusterId')
  @ApiOperation({ summary: 'Get cluster by ID', description: 'Retrieves a single cluster with all its details, members, and plans.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiResponse({ status: 200, description: 'Cluster found' })
  @ApiResponse({ status: 404, description: 'Cluster not found' })
  findCluster(@Param('clusterId') clusterId: string) {
    return this.clustersService.findCluster(clusterId);
  }

  @Patch(':clusterId')
  @ApiOperation({ summary: 'Update cluster', description: 'Updates the name, description, or other fields of an existing cluster.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiBody({ type: CreateClusterDto, description: 'Fields to update (partial)' })
  @ApiResponse({ status: 200, description: 'Cluster updated successfully' })
  updateCluster(
    @Param('clusterId') clusterId: string,
    @Body() body: Partial<CreateClusterDto>,
  ) {
    return this.clustersService.updateClusterDetails(clusterId, body);
  }

  @Delete(':clusterId')
  @ApiOperation({ summary: 'Delete cluster', description: 'Permanently deletes a cluster and all its associated plans and memberships.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiResponse({ status: 200, description: 'Cluster deleted successfully' })
  deleteCluster(@Param('clusterId') clusterId: string) {
    return this.clustersService.deleteCluster(clusterId);
  }

  @Patch(':clusterId/account-number')
  @ApiOperation({ summary: 'Update cluster account number', description: 'Updates the virtual account number assigned to a cluster.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiBody({ description: 'New account number', schema: { example: { accountNumber: '0987654321' } } })
  @ApiResponse({ status: 200, description: 'Account number updated' })
  updateClusterAccountNumber(
    @Param('clusterId') clusterId: string,
    @Body() body: UpdateClusterAccountBody,
  ) {
    return this.clustersService.updateClusterAccountNumber(clusterId, body);
  }

  @Post(':clusterId/members')
  @ApiOperation({ summary: 'Add cluster member', description: 'Adds a user as a member of the specified cluster.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiBody({ type: MemberBody, description: 'User ID to add' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  addClusterMember(
    @Param('clusterId') clusterId: string,
    @Body() body: MemberBody,
  ) {
    return this.clustersService.addClusterMember(clusterId, body.userId);
  }

  @Delete(':clusterId/members/:userId')
  @ApiOperation({ summary: 'Remove cluster member', description: 'Removes a user from the specified cluster.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiParam({ name: 'userId', description: 'The user ID to remove', example: 'user_abc123' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  removeClusterMember(
    @Param('clusterId') clusterId: string,
    @Param('userId') userId: string,
  ) {
    return this.clustersService.removeClusterMember(clusterId, userId);
  }

  @Post(':clusterId/plans')
  @ApiOperation({ summary: 'Create a plan', description: 'Creates a new savings plan within the specified cluster.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiBody({ type: CreatePlanDto, description: 'Plan creation payload' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  createPlan(
    @Param('clusterId') clusterId: string,
    @Body() body: CreatePlanDto,
  ) {
    return this.clustersService.createPlan(clusterId, body);
  }

  @Patch(':clusterId/plans/:planId')
  @ApiOperation({ summary: 'Update a plan', description: 'Updates the name, description, or minimum contribution of a plan.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiParam({ name: 'planId', description: 'The plan ID', example: 'plan_abc123' })
  @ApiBody({ type: EditPlanDto, description: 'Plan fields to update' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  updatePlan(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
    @Body() body: EditPlanDto,
  ) {
    return this.clustersService.updatePlan(clusterId, planId, body);
  }

  @Get(':clusterId/plans')
  @ApiOperation({ summary: 'List cluster plans', description: 'Retrieves all savings plans within a cluster.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiResponse({ status: 200, description: 'Plans returned successfully' })
  findPlans(@Param('clusterId') clusterId: string) {
    return this.clustersService.findPlans(clusterId);
  }

  @Get(':clusterId/plans/:planId')
  @ApiOperation({ summary: 'Get plan by ID', description: 'Retrieves a single plan with its details and members.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiParam({ name: 'planId', description: 'The plan ID', example: 'plan_abc123' })
  @ApiResponse({ status: 200, description: 'Plan found' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  findPlan(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
  ) {
    return this.clustersService.findPlan(clusterId, planId);
  }

  @Delete(':clusterId/plans/:planId')
  @ApiOperation({ summary: 'Delete a plan', description: 'Permanently deletes a plan and its member associations.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiParam({ name: 'planId', description: 'The plan ID', example: 'plan_abc123' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  deletePlan(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
  ) {
    return this.clustersService.deletePlan(clusterId, planId);
  }

  @Post(':clusterId/plans/:planId/members')
  @ApiOperation({ summary: 'Add plan member', description: 'Adds a user as a member of the specified plan.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiParam({ name: 'planId', description: 'The plan ID', example: 'plan_abc123' })
  @ApiBody({ type: MemberBody, description: 'User ID to add' })
  @ApiResponse({ status: 201, description: 'Member added to plan' })
  addPlanMember(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
    @Body() body: MemberBody,
  ) {
    return this.clustersService.addPlanMember(clusterId, planId, body.userId);
  }

  @Delete(':clusterId/plans/:planId/members/:userId')
  @ApiOperation({ summary: 'Remove plan member', description: 'Removes a user from the specified plan.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiParam({ name: 'planId', description: 'The plan ID', example: 'plan_abc123' })
  @ApiParam({ name: 'userId', description: 'The user ID to remove', example: 'user_abc123' })
  @ApiResponse({ status: 200, description: 'Member removed from plan' })
  removePlanMember(
    @Param('clusterId') clusterId: string,
    @Param('planId') planId: string,
    @Param('userId') userId: string,
  ) {
    return this.clustersService.removePlanMember(clusterId, planId, userId);
  }

  @Post(':clusterId/pay-from-account')
  @ApiOperation({ summary: 'Pay from user account', description: 'Transfers funds from a user\'s GrouPay account into the cluster\'s balance.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiBody({ type: PayFromAccountDto, description: 'User ID and amount to transfer' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid request' })
  payFromAccount(
    @Param('clusterId') clusterId: string,
    @Body() body: PayFromAccountDto,
  ) {
    return this.clustersService.payFromAccount(clusterId, body);
  }

  @Post(':clusterId/pending-transaction')
  @ApiOperation({ summary: 'Register pending transaction', description: 'Records a user\'s intent to pay into the cluster\'s virtual account. Matched against incoming Squad webhooks.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID' })
  @ApiBody({ type: CreatePendingTransactionDto })
  @ApiResponse({ status: 201, description: 'Pending transaction registered' })
  createPendingTransaction(
    @Param('clusterId') clusterId: string,
    @Body() body: CreatePendingTransactionDto,
  ) {
    return this.clustersService.createPendingTransaction(clusterId, body);
  }

  @Post(':clusterId/requestVirtual')
  @ApiOperation({ summary: 'Request virtual account for cluster', description: 'Creates a Squad virtual account number for the cluster to receive payments.' })
  @ApiParam({ name: 'clusterId', description: 'The cluster ID', example: 'clust_abc123' })
  @ApiBody({ type: VirtualAccountDto, description: 'Virtual account request payload' })
  @ApiResponse({ status: 201, description: 'Virtual account created', schema: { example: { accountNumber: '1234567890', accountName: 'Monthly Savings Group', bankName: 'Providus Bank' } } })
  requestVA(
    @Param('clusterId') clusterId: string,
    @Body() body: VirtualAccountDto,
  ) {
    return this.clustersService.requestVirtualAccountNumber(clusterId, body);
  }
}
