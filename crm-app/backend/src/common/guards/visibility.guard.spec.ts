import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { VisibilityGuard } from './visibility.guard';

function makeContext(user: Record<string, unknown>): ExecutionContext {
  const req: any = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('VisibilityGuard', () => {
  let guard: VisibilityGuard;

  const teamId = 'team-1';
  const userId = 'user-1';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [VisibilityGuard],
    }).compile();

    guard = module.get(VisibilityGuard);
  });

  it('SYSTEM_ADMINISTRATOR sees all (no ownerId filter)', async () => {
    const ctx = makeContext({
      sub: userId,
      role: 'SYSTEM_ADMINISTRATOR',
      teamIds: [],
    });
    const req = ctx.switchToHttp().getRequest();
    await guard.canActivate(ctx);
    expect(req.visibilityFilter).toEqual({});
  });

  it('SALES_MANAGER sees own + team IDs', async () => {
    const ctx = makeContext({
      sub: userId,
      role: 'SALES_MANAGER',
      teamIds: [teamId],
    });
    const req = ctx.switchToHttp().getRequest();
    await guard.canActivate(ctx);
    expect(req.visibilityFilter.ownerIdIn).toContain(userId);
    expect(req.visibilityFilter.ownerIdIn).toContain(teamId);
  });

  it('SALES_REPRESENTATIVE sees own records only', async () => {
    const ctx = makeContext({
      sub: userId,
      role: 'SALES_REPRESENTATIVE',
      teamIds: [],
    });
    const req = ctx.switchToHttp().getRequest();
    await guard.canActivate(ctx);
    expect(req.visibilityFilter.ownerId).toBe(userId);
  });

  it('READ_ONLY sees own records only', async () => {
    const ctx = makeContext({ sub: userId, role: 'READ_ONLY', teamIds: [] });
    const req = ctx.switchToHttp().getRequest();
    await guard.canActivate(ctx);
    expect(req.visibilityFilter.ownerId).toBe(userId);
  });
});
