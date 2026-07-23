import { SetMetadata } from '@nestjs/common';

export const CLUSTER_ROLES_KEY = 'clusterRoles';
export const ClusterRole = (...roles: string[]) => SetMetadata(CLUSTER_ROLES_KEY, roles);
