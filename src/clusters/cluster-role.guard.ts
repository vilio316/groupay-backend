import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { CLUSTER_ROLES_KEY } from './cluster-role.decorator';

@Injectable()
export class ClusterRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      CLUSTER_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const clusterId =
      request.params.clusterId ?? request.params.id;

    if (!clusterId) {
      throw new ForbiddenException('Cluster ID not found in request');
    }

    const member = await this.prisma.member.findFirst({
      where: {
        organizationId: clusterId,
        userId: session.user.id,
      },
      select: { role: true },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this cluster');
    }

    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException(
        `This action requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
