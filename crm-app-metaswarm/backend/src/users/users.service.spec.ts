import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuditAction, RoleName, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateTeamsDto } from './dto/update-teams.dto';
import { QueryUsersDto } from './dto/query-users.dto';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  role: { findUnique: jest.fn() },
  teamMember: { deleteMany: jest.fn(), createMany: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockAuthService = {
  revokeAllUserTokens: jest.fn(),
  requestPasswordReset: jest.fn(),
};

// ---------------------------------------------------------------------------
// Shared fixture builders
// ---------------------------------------------------------------------------

const mockRole = { id: 'role-1', name: RoleName.SALES_REPRESENTATIVE };
const mockTeam = { id: 'team-1', name: 'Alpha Squad' };
const mockTeam2 = { id: 'team-2', name: 'Beta Squad' };

function buildUser(overrides: Partial<{
  id: string;
  email: string;
  status: UserStatus;
  roleId: string;
  role: object;
  teamMemberships: { teamId: string; team: object }[];
}> = {}) {
  return {
    id: 'user-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    jobTitle: null,
    status: UserStatus.ACTIVE,
    roleId: 'role-1',
    role: mockRole,
    teamMemberships: [{ teamId: 'team-1', team: mockTeam }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    const baseQuery: QueryUsersDto = { page: 1, pageSize: 20, sortOrder: 'asc' };

    beforeEach(() => {
      mockPrisma.user.findMany.mockResolvedValue([buildUser()]);
      mockPrisma.user.count.mockResolvedValue(1);
    });

    it('should return paginated users with meta for SYSTEM_ADMINISTRATOR', async () => {
      const result = await service.findAll(baseQuery, RoleName.SYSTEM_ADMINISTRATOR, []);

      expect(result).toEqual({
        data: [buildUser()],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    it('should apply roleId filter when provided', async () => {
      const query: QueryUsersDto = { ...baseQuery, roleId: 'role-1' };

      await service.findAll(query, RoleName.SYSTEM_ADMINISTRATOR, []);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(findManyCall.where).toMatchObject({ roleId: 'role-1' });
    });

    it('should apply teamId filter when provided', async () => {
      const query: QueryUsersDto = { ...baseQuery, teamId: 'team-1' };

      await service.findAll(query, RoleName.SYSTEM_ADMINISTRATOR, []);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(findManyCall.where).toMatchObject({
        teamMemberships: { some: { teamId: 'team-1' } },
      });
    });

    it('should apply status filter when provided', async () => {
      const query: QueryUsersDto = { ...baseQuery, status: UserStatus.INACTIVE };

      await service.findAll(query, RoleName.SYSTEM_ADMINISTRATOR, []);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(findManyCall.where).toMatchObject({ status: UserStatus.INACTIVE });
    });

    it('should apply search filter across firstName, lastName, email', async () => {
      const query: QueryUsersDto = { ...baseQuery, search: 'jane' };

      await service.findAll(query, RoleName.SYSTEM_ADMINISTRATOR, []);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(findManyCall.where).toMatchObject({
        OR: [
          { firstName: { contains: 'jane', mode: 'insensitive' } },
          { lastName: { contains: 'jane', mode: 'insensitive' } },
          { email: { contains: 'jane', mode: 'insensitive' } },
        ],
      });
    });

    it('should apply sortBy when provided', async () => {
      const query: QueryUsersDto = { ...baseQuery, sortBy: 'email', sortOrder: 'desc' };

      await service.findAll(query, RoleName.SYSTEM_ADMINISTRATOR, []);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        orderBy: Record<string, unknown>;
      };
      expect(findManyCall.orderBy).toEqual({ email: 'desc' });
    });

    it('should default orderBy to createdAt asc when sortBy is omitted', async () => {
      await service.findAll(baseQuery, RoleName.SYSTEM_ADMINISTRATOR, []);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        orderBy: Record<string, unknown>;
      };
      expect(findManyCall.orderBy).toEqual({ createdAt: 'asc' });
    });

    it('should restrict SALES_MANAGER to their own team members', async () => {
      const query: QueryUsersDto = { ...baseQuery };

      await service.findAll(query, RoleName.SALES_MANAGER, ['team-1', 'team-2']);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(findManyCall.where).toMatchObject({
        teamMemberships: { some: { teamId: { in: ['team-1', 'team-2'] } } },
      });
    });

    it('should compute correct totalPages', async () => {
      mockPrisma.user.count.mockResolvedValue(45);
      const query: QueryUsersDto = { ...baseQuery, pageSize: 20 };

      const result = await service.findAll(query, RoleName.SYSTEM_ADMINISTRATOR, []);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should apply correct pagination skip and take', async () => {
      const query: QueryUsersDto = { ...baseQuery, page: 3, pageSize: 10 };

      await service.findAll(query, RoleName.SYSTEM_ADMINISTRATOR, []);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        skip: number;
        take: number;
      };
      expect(findManyCall.skip).toBe(20);
      expect(findManyCall.take).toBe(10);
    });

    it('uses default page=1, pageSize=20, sortOrder=asc when query is empty', async () => {
      await service.findAll({}, RoleName.SYSTEM_ADMINISTRATOR, []);

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0] as {
        skip: number;
        take: number;
        orderBy: Record<string, string>;
      };
      expect(findManyCall.skip).toBe(0);  // (1-1)*20
      expect(findManyCall.take).toBe(20);
      expect(findManyCall.orderBy).toEqual({ createdAt: 'asc' });
    });

  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  describe('findOne', () => {
    it('should return a user for SYSTEM_ADMINISTRATOR regardless of team', async () => {
      const user = buildUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('user-1', RoleName.SYSTEM_ADMINISTRATOR, []);

      expect(result).toEqual(user);
    });

    it('should throw USER_NOT_FOUND (404) when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('no-such-id', RoleName.SYSTEM_ADMINISTRATOR, []),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findOne('no-such-id', RoleName.SYSTEM_ADMINISTRATOR, []),
      ).rejects.toMatchObject({ response: { code: 'USER_NOT_FOUND' } });
    });

    it('should allow SALES_MANAGER to view user in own team', async () => {
      const user = buildUser({ teamMemberships: [{ teamId: 'team-1', team: mockTeam }] });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('user-1', RoleName.SALES_MANAGER, ['team-1']);

      expect(result).toEqual(user);
    });

    it('should throw FORBIDDEN (403) when SALES_MANAGER views user in another team', async () => {
      const user = buildUser({ teamMemberships: [{ teamId: 'team-2', team: mockTeam2 }] });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.findOne('user-1', RoleName.SALES_MANAGER, ['team-1']),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.findOne('user-1', RoleName.SALES_MANAGER, ['team-1']),
      ).rejects.toMatchObject({ response: { code: 'FORBIDDEN' } });
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    const dto: CreateUserDto = {
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      roleId: 'role-1',
      teamIds: ['team-1'],
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // no duplicate
      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.user.create.mockResolvedValue(buildUser({ email: dto.email }));
      mockAuthService.requestPasswordReset.mockResolvedValue(undefined);
    });

    it('should create a user and return the created record', async () => {
      const result = await service.create(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should call authService.requestPasswordReset with the new user email', async () => {
      await service.create(dto);

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(dto.email);
    });

    it('should throw EMAIL_ALREADY_EXISTS (409) when email is taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toMatchObject({
        response: { code: 'EMAIL_ALREADY_EXISTS' },
      });
    });

    it('should throw ROLE_NOT_FOUND (400) when roleId does not exist', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toMatchObject({
        response: { code: 'ROLE_NOT_FOUND' },
      });
    });

    it('should create teamMemberships when teamIds are provided', async () => {
      await service.create(dto);

      const createCall = mockPrisma.user.create.mock.calls[0][0] as {
        data: { teamMemberships: { createMany: { data: { teamId: string }[] } } };
      };
      expect(createCall.data.teamMemberships.createMany.data).toEqual([{ teamId: 'team-1' }]);
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    const dto: UpdateUserDto = { firstName: 'Updated' };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      mockPrisma.user.update.mockResolvedValue(buildUser({ ...dto } as Partial<ReturnType<typeof buildUser>>));
    });

    it('should update user fields and return the updated record', async () => {
      const result = await service.update('user-1', dto);

      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should throw USER_NOT_FOUND (404) when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('no-such-id', dto)).rejects.toThrow(NotFoundException);
      await expect(service.update('no-such-id', dto)).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // deactivate
  // -------------------------------------------------------------------------

  describe('deactivate', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      mockPrisma.user.update.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }));
      mockAuthService.revokeAllUserTokens.mockResolvedValue(undefined);
      mockPrisma.auditLog.create.mockResolvedValue({});
    });

    it('should set user status to INACTIVE', async () => {
      await service.deactivate('user-1', 'actor-id');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: UserStatus.INACTIVE } }),
      );
    });

    it('should call revokeAllUserTokens with the user id', async () => {
      await service.deactivate('user-1', 'actor-id');

      expect(mockAuthService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('should create STATUS_CHANGED audit log entry', async () => {
      await service.deactivate('user-1', 'actor-id');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.STATUS_CHANGED,
            resourceType: 'User',
            resourceId: 'user-1',
          }),
        }),
      );
    });

    it('should throw USER_NOT_FOUND (404) when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deactivate('no-such-id', 'actor-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deactivate('no-such-id', 'actor-id')).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });

    it('should throw CANNOT_DEACTIVATE_SELF (409) when actor deactivates own account', async () => {
      await expect(service.deactivate('user-1', 'user-1')).rejects.toThrow(ConflictException);
      await expect(service.deactivate('user-1', 'user-1')).rejects.toMatchObject({
        response: { code: 'CANNOT_DEACTIVATE_SELF' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // reactivate
  // -------------------------------------------------------------------------

  describe('reactivate', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }));
      mockPrisma.user.update.mockResolvedValue(buildUser({ status: UserStatus.ACTIVE }));
      mockPrisma.auditLog.create.mockResolvedValue({});
    });

    it('should set user status to ACTIVE', async () => {
      await service.reactivate('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: UserStatus.ACTIVE } }),
      );
    });

    it('should create STATUS_CHANGED audit log entry', async () => {
      await service.reactivate('user-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.STATUS_CHANGED,
            resourceType: 'User',
            resourceId: 'user-1',
          }),
        }),
      );
    });

    it('should throw USER_NOT_FOUND (404) when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.reactivate('no-such-id')).rejects.toThrow(NotFoundException);
      await expect(service.reactivate('no-such-id')).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // adminResetPassword
  // -------------------------------------------------------------------------

  describe('adminResetPassword', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      mockAuthService.requestPasswordReset.mockResolvedValue(undefined);
    });

    it('should call requestPasswordReset with the user email', async () => {
      await service.adminResetPassword('user-1');

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('jane@example.com');
    });

    it('should throw USER_NOT_FOUND (404) when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.adminResetPassword('no-such-id')).rejects.toThrow(NotFoundException);
      await expect(service.adminResetPassword('no-such-id')).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // updateRole
  // -------------------------------------------------------------------------

  describe('updateRole', () => {
    const dto: UpdateRoleDto = { roleId: 'role-2' };
    const newRole = { id: 'role-2', name: RoleName.SALES_MANAGER };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      mockPrisma.role.findUnique.mockResolvedValue(newRole);
      mockPrisma.user.update.mockResolvedValue(buildUser({ roleId: 'role-2', role: newRole }));
      mockAuthService.revokeAllUserTokens.mockResolvedValue(undefined);
      mockPrisma.auditLog.create.mockResolvedValue({});
    });

    it('should update user role and return the updated record', async () => {
      const result = await service.updateRole('user-1', dto);

      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should call revokeAllUserTokens with the user id', async () => {
      await service.updateRole('user-1', dto);

      expect(mockAuthService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('should create ROLE_CHANGED audit log entry', async () => {
      await service.updateRole('user-1', dto);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.ROLE_CHANGED,
            resourceType: 'User',
            resourceId: 'user-1',
          }),
        }),
      );
    });

    it('should throw USER_NOT_FOUND (404) when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateRole('no-such-id', dto)).rejects.toThrow(NotFoundException);
      await expect(service.updateRole('no-such-id', dto)).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });

    it('should throw ROLE_NOT_FOUND (400) when roleId does not exist', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.updateRole('user-1', dto)).rejects.toThrow(BadRequestException);
      await expect(service.updateRole('user-1', dto)).rejects.toMatchObject({
        response: { code: 'ROLE_NOT_FOUND' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // updateTeams
  // -------------------------------------------------------------------------

  describe('updateTeams', () => {
    const dto: UpdateTeamsDto = { teamIds: ['team-1', 'team-2'] };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      mockPrisma.$transaction.mockResolvedValue([undefined, undefined]);
      mockPrisma.user.update.mockResolvedValue(
        buildUser({
          teamMemberships: [
            { teamId: 'team-1', team: mockTeam },
            { teamId: 'team-2', team: mockTeam2 },
          ],
        }),
      );
    });

    it('should replace team memberships using a transaction', async () => {
      await service.updateTeams('user-1', dto);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should deleteMany existing memberships then createMany new ones', async () => {
      await service.updateTeams('user-1', dto);

      const txArgs = mockPrisma.$transaction.mock.calls[0][0] as unknown[];
      // transaction receives an array of two prisma operations
      expect(txArgs).toHaveLength(2);
    });

    it('should return the updated user with new team memberships', async () => {
      const result = await service.updateTeams('user-1', dto);

      expect(result).toBeDefined();
    });

    it('should throw USER_NOT_FOUND (404) when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateTeams('no-such-id', dto)).rejects.toThrow(NotFoundException);
      await expect(service.updateTeams('no-such-id', dto)).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });
  });
});
