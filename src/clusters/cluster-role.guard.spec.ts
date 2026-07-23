import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClusterRoleGuard } from './cluster-role.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CLUSTER_ROLES_KEY } from './cluster-role.decorator';

function createMockContext(
  overrides: {
    session?: any;
    params?: Record<string, string>;
    roles?: string[];
  } = {},
) {
  const req: any = {
    session: overrides.session ?? { user: { id: 'user-1' } },
    params: overrides.params ?? { clusterId: 'cluster-1' },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => null,
    getClass: () => null,
  } as any;
}

describe('ClusterRoleGuard', () => {
  let guard: ClusterRoleGuard;
  let reflector: Record<string, any>;
  let prisma: Record<string, any>;

  const mockPrisma = {
    member: {
      findFirst: jest.fn(),
    },
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    reflector = mockReflector;
    prisma = mockPrisma;
    guard = new ClusterRoleGuard(reflector as unknown as Reflector, prisma as unknown as PrismaService);
  });

  it('should return true when no roles are required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const result = await guard.canActivate(createMockContext());
    expect(result).toBe(true);
  });

  it('should return true when required roles array is empty', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    const result = await guard.canActivate(createMockContext());
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when no session user', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['owner']);
    const ctx = createMockContext({ session: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException when no clusterId in params', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['owner']);
    const ctx = createMockContext({ params: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not a member', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['owner']);
    mockPrisma.member.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(createMockContext())).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when role is not in required roles', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['owner']);
    mockPrisma.member.findFirst.mockResolvedValue({ role: 'member' });
    await expect(guard.canActivate(createMockContext())).rejects.toThrow(ForbiddenException);
  });

  it('should return true when user has the required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['owner', 'admin']);
    mockPrisma.member.findFirst.mockResolvedValue({ role: 'admin' });
    const result = await guard.canActivate(createMockContext());
    expect(result).toBe(true);
  });

  it('should match using request.params.id when clusterId is absent', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['owner']);
    mockPrisma.member.findFirst.mockResolvedValue({ role: 'owner' });
    const ctx = createMockContext({ params: { id: 'cluster-1' } });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.member.findFirst).toHaveBeenCalledWith({
      where: { organizationId: 'cluster-1', userId: 'user-1' },
      select: { role: true },
    });
  });
});
