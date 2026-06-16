import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateTeamsDto } from './dto/update-teams.dto';

// ---------------------------------------------------------------------------
// Mock service — all methods are jest.fn(); individual tests set return values
// ---------------------------------------------------------------------------
const mockUsersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
  reactivate: jest.fn(),
  adminResetPassword: jest.fn(),
  updateRole: jest.fn(),
  updateTeams: jest.fn(),
};

// Actors injected via @CurrentUser() decorator in real requests —
// tests pass them directly as arguments since the controller is called directly.
const adminActor = {
  sub: 'actor-admin-id',
  email: 'admin@example.com',
  role: RoleName.SYSTEM_ADMINISTRATOR,
  teamIds: [] as string[],
};

const managerActor = {
  sub: 'actor-manager-id',
  email: 'manager@example.com',
  role: RoleName.SALES_MANAGER,
  teamIds: ['team-1'],
};

// Minimal user shape returned by the service
const mockUser = {
  id: 'user-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: { id: 'role-1', name: RoleName.SALES_REPRESENTATIVE },
  teamMemberships: [],
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  // -------------------------------------------------------------------------
  // 1. GET /users — findAll
  // -------------------------------------------------------------------------
  describe('GET /users (findAll)', () => {
    it('delegates to usersService.findAll with query, actor role and teamIds', async () => {
      const query: QueryUsersDto = { page: 1, pageSize: 10 };
      const serviceResult = {
        data: [mockUser],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      };
      mockUsersService.findAll.mockResolvedValue(serviceResult);

      const result = await controller.findAll(query, managerActor);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        query,
        managerActor.role,
        managerActor.teamIds,
      );
      expect(result).toEqual({ data: [mockUser], meta: serviceResult.meta });
    });

    it('returns paginated envelope { data, meta }', async () => {
      const query: QueryUsersDto = {};
      const serviceResult = {
        data: [mockUser, mockUser],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      };
      mockUsersService.findAll.mockResolvedValue(serviceResult);

      const result = await controller.findAll(query, adminActor);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toMatchObject({ total: 2, page: 1, pageSize: 20, totalPages: 1 });
    });
  });

  // -------------------------------------------------------------------------
  // 2. POST /users — create (201)
  // -------------------------------------------------------------------------
  describe('POST /users (create)', () => {
    it('delegates to usersService.create and returns { data: user }', async () => {
      const dto: CreateUserDto = {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        roleId: 'role-1',
      };
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockUser });
    });

    it('propagates EMAIL_ALREADY_EXISTS ConflictException from service', async () => {
      const dto: CreateUserDto = {
        email: 'existing@example.com',
        firstName: 'Dup',
        lastName: 'User',
        roleId: 'role-1',
      };
      mockUsersService.create.mockRejectedValue(
        new ConflictException({ code: 'EMAIL_ALREADY_EXISTS', message: 'Email already in use' }),
      );

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('propagates ROLE_NOT_FOUND BadRequestException from service', async () => {
      const dto: CreateUserDto = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        roleId: 'role-does-not-exist',
      };
      mockUsersService.create.mockRejectedValue(
        new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' }),
      );

      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // 3. GET /users/:id — findOne
  // -------------------------------------------------------------------------
  describe('GET /users/:id (findOne)', () => {
    it('delegates to usersService.findOne and returns { data: user }', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-1', adminActor);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(
        'user-1',
        adminActor.role,
        adminActor.teamIds,
      );
      expect(result).toEqual({ data: mockUser });
    });

    it('propagates USER_NOT_FOUND NotFoundException from service', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.findOne('missing-id', adminActor)).rejects.toThrow(NotFoundException);
    });

    it('propagates FORBIDDEN ForbiddenException when SALES_MANAGER has no overlap', async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      mockUsersService.findOne.mockRejectedValue(
        new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' }),
      );

      await expect(controller.findOne('user-other-team', managerActor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // 4. PATCH /users/:id — update (200)
  // -------------------------------------------------------------------------
  describe('PATCH /users/:id (update)', () => {
    it('delegates to usersService.update and returns { data: user }', async () => {
      const dto: UpdateUserDto = { firstName: 'Janet' };
      const updatedUser = { ...mockUser, firstName: 'Janet' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('user-1', dto);

      expect(mockUsersService.update).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ data: updatedUser });
    });

    it('propagates USER_NOT_FOUND NotFoundException from service', async () => {
      const dto: UpdateUserDto = { firstName: 'Ghost' };
      mockUsersService.update.mockRejectedValue(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.update('missing-id', dto)).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // 5. POST /users/:id/deactivate — deactivate (204)
  // -------------------------------------------------------------------------
  describe('POST /users/:id/deactivate (deactivate)', () => {
    it('delegates to usersService.deactivate with id and actorId, returns void', async () => {
      mockUsersService.deactivate.mockResolvedValue(undefined);

      const result = await controller.deactivate('user-1', adminActor);

      expect(mockUsersService.deactivate).toHaveBeenCalledWith('user-1', adminActor.sub);
      expect(result).toBeUndefined();
    });

    it('propagates USER_NOT_FOUND NotFoundException from service', async () => {
      mockUsersService.deactivate.mockRejectedValue(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.deactivate('missing-id', adminActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('propagates CANNOT_DEACTIVATE_SELF ConflictException from service', async () => {
      mockUsersService.deactivate.mockRejectedValue(
        new ConflictException({
          code: 'CANNOT_DEACTIVATE_SELF',
          message: 'Cannot deactivate own account',
        }),
      );

      await expect(controller.deactivate(adminActor.sub, adminActor)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // 6. POST /users/:id/reactivate — reactivate (204)
  // -------------------------------------------------------------------------
  describe('POST /users/:id/reactivate (reactivate)', () => {
    it('delegates to usersService.reactivate with id, returns void', async () => {
      mockUsersService.reactivate.mockResolvedValue(undefined);

      const result = await controller.reactivate('user-1');

      expect(mockUsersService.reactivate).toHaveBeenCalledWith('user-1');
      expect(result).toBeUndefined();
    });

    it('propagates USER_NOT_FOUND NotFoundException from service', async () => {
      mockUsersService.reactivate.mockRejectedValue(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.reactivate('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // 7. POST /users/:id/reset-password — adminResetPassword (202)
  // -------------------------------------------------------------------------
  describe('POST /users/:id/reset-password (adminResetPassword)', () => {
    it('delegates to usersService.adminResetPassword with id, returns void', async () => {
      mockUsersService.adminResetPassword.mockResolvedValue(undefined);

      const result = await controller.adminResetPassword('user-1');

      expect(mockUsersService.adminResetPassword).toHaveBeenCalledWith('user-1');
      expect(result).toBeUndefined();
    });

    it('propagates USER_NOT_FOUND NotFoundException from service', async () => {
      mockUsersService.adminResetPassword.mockRejectedValue(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.adminResetPassword('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // 8. PATCH /users/:id/role — updateRole (200)
  // -------------------------------------------------------------------------
  describe('PATCH /users/:id/role (updateRole)', () => {
    it('delegates to usersService.updateRole and returns { data: user }', async () => {
      const dto: UpdateRoleDto = { roleId: 'role-manager' };
      const updatedUser = { ...mockUser, role: { id: 'role-manager', name: RoleName.SALES_MANAGER } };
      mockUsersService.updateRole.mockResolvedValue(updatedUser);

      const result = await controller.updateRole('user-1', dto);

      expect(mockUsersService.updateRole).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ data: updatedUser });
    });

    it('propagates USER_NOT_FOUND NotFoundException from service', async () => {
      const dto: UpdateRoleDto = { roleId: 'role-manager' };
      mockUsersService.updateRole.mockRejectedValue(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.updateRole('missing-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('propagates ROLE_NOT_FOUND BadRequestException from service', async () => {
      const dto: UpdateRoleDto = { roleId: 'role-bad' };
      mockUsersService.updateRole.mockRejectedValue(
        new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' }),
      );

      await expect(controller.updateRole('user-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // 9. PATCH /users/:id/teams — updateTeams (200)
  // -------------------------------------------------------------------------
  describe('PATCH /users/:id/teams (updateTeams)', () => {
    it('delegates to usersService.updateTeams and returns { data: user }', async () => {
      const dto: UpdateTeamsDto = { teamIds: ['team-1', 'team-2'] };
      const updatedUser = { ...mockUser, teamMemberships: [{ teamId: 'team-1' }, { teamId: 'team-2' }] };
      mockUsersService.updateTeams.mockResolvedValue(updatedUser);

      const result = await controller.updateTeams('user-1', dto);

      expect(mockUsersService.updateTeams).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ data: updatedUser });
    });

    it('propagates USER_NOT_FOUND NotFoundException from service', async () => {
      const dto: UpdateTeamsDto = { teamIds: [] };
      mockUsersService.updateTeams.mockRejectedValue(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      await expect(controller.updateTeams('missing-id', dto)).rejects.toThrow(NotFoundException);
    });
  });
});
