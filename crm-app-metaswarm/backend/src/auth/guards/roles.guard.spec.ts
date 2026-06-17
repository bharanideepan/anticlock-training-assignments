import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  function mockContext(
    userRole: RoleName | undefined,
    requiredRoles: RoleName[] | undefined,
  ): ExecutionContext {
    const handler = jest.fn();
    const cls = jest.fn();
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole ? { role: userRole } : undefined,
        }),
      }),
      getHandler: () => handler,
      getClass: () => cls,
    } as unknown as ExecutionContext;
  }

  it('allows access when no roles decorator is applied', () => {
    const ctx = mockContext(RoleName.SALES_REPRESENTATIVE, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when required roles list is empty', () => {
    const ctx = mockContext(RoleName.SALES_REPRESENTATIVE, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role matches a required role', () => {
    const ctx = mockContext(RoleName.SYSTEM_ADMINISTRATOR, [RoleName.SYSTEM_ADMINISTRATOR]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role is one of multiple required roles', () => {
    const ctx = mockContext(RoleName.SALES_MANAGER, [
      RoleName.SYSTEM_ADMINISTRATOR,
      RoleName.SALES_MANAGER,
    ]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when user role does not match any required role', () => {
    const ctx = mockContext(RoleName.SALES_REPRESENTATIVE, [RoleName.SYSTEM_ADMINISTRATOR]);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies access when user is undefined (unauthenticated)', () => {
    const ctx = mockContext(undefined, [RoleName.SYSTEM_ADMINISTRATOR]);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('uses ROLES_KEY metadata key when querying reflector', () => {
    const ctx = mockContext(RoleName.SYSTEM_ADMINISTRATOR, [RoleName.SYSTEM_ADMINISTRATOR]);
    guard.canActivate(ctx);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });
});
