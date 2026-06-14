import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { VisibilityGuard } from './visibility.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

function makeContext(user: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('VisibilityGuard', () => {
  let guard: VisibilityGuard;

  const teamId = 'team-1';
  const userId = 'user-1';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VisibilityGuard,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest
                .fn()
                .mockResolvedValue([{ id: 'member-1' }, { id: 'member-2' }]),
            },
          },
        },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    guard = module.get(VisibilityGuard);
  });

  it('SYSTEM_ADMINISTRATOR sees all (no ownerId filter)', async () => {
    const ctx = makeContext({
      id: userId,
      role: 'SYSTEM_ADMINISTRATOR',
      teams: [],
    });
    const req = ctx.switchToHttp().getRequest();
    await guard.canActivate(ctx);
    expect(req.visibilityFilter).toEqual({});
  });

  it('SALES_MANAGER sees own + team members', async () => {
    const ctx = makeContext({
      id: userId,
      role: 'SALES_MANAGER',
      teams: [{ teamId }],
    });
    const req = ctx.switchToHttp().getRequest();
    await guard.canActivate(ctx);
    expect(req.visibilityFilter.ownerIdIn).toContain(userId);
    expect(req.visibilityFilter.ownerIdIn).toContain('member-1');
  });

  it('SALES_REPRESENTATIVE sees own records only', async () => {
    const ctx = makeContext({
      id: userId,
      role: 'SALES_REPRESENTATIVE',
      teams: [],
    });
    const req = ctx.switchToHttp().getRequest();
    await guard.canActivate(ctx);
    expect(req.visibilityFilter.ownerId).toBe(userId);
  });

  it('READ_ONLY sees own records only', async () => {
    const ctx = makeContext({ id: userId, role: 'READ_ONLY', teams: [] });
    const req = ctx.switchToHttp().getRequest();
    await guard.canActivate(ctx);
    expect(req.visibilityFilter.ownerId).toBe(userId);
  });
});
