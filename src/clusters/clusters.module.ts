import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClustersController } from './clusters.controller';
import { ClustersService } from './clusters.service';
import { UsersPlansController } from './users-plans.controller';
import { ClusterRoleGuard } from './cluster-role.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ClustersController, UsersPlansController],
  providers: [ClustersService, ClusterRoleGuard],
})
export class ClustersModule {}
