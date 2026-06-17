import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMembersDto } from './dto/add-members.dto';

// ---------------------------------------------------------------------------
// Mock service — all methods are jest.fn(); individual tests set return values
// ---------------------------------------------------------------------------
const mockTeamsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addMembers: jest.fn(),
  removeMember: jest.fn(),
};

// Minimal team shape returned by the service
const mockTeam = {
  id: 'team-1',
  name: 'West Coast Sales',
  description: 'Covers CA, OR, WA',
  managerId: 'manager-1',
  manager: { id: 'manager-1', firstName: 'Alice', lastName: 'Smith' },
  _count: { members: 3 },
  deletedAt: null,
};

const mockTeamDetailed = {
  ...mockTeam,
  members: [
    {
      userId: 'user-1',
      teamId: 'team-1',
      user: {
        id: 'user-1',
        firstName: 'Bob',
        lastName: 'Jones',
        role: { id: 'role-1', name: RoleName.SALES_REPRESENTATIVE },
      },
    },
  ],
};

describe('TeamsController', () => {
  let controller: TeamsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [{ provide: TeamsService, useValue: mockTeamsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TeamsController>(TeamsController);
  });

  // -------------------------------------------------------------------------
  // 1. GET /teams — findAll (JwtAuthGuard only, no RolesGuard)
  // -------------------------------------------------------------------------
  describe('GET /teams (findAll)', () => {
    it('delegates to teamsService.findAll with query and returns { data, meta }', async () => {
      const query: QueryTeamsDto = { page: 1, pageSize: 10 };
      const serviceResult = {
        data: [mockTeam],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      };
      mockTeamsService.findAll.mockResolvedValue(serviceResult);

      const result = await controller.findAll(query);

      expect(mockTeamsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [mockTeam], meta: serviceResult.meta });
    });

    it('returns paginated envelope { data, meta }', async () => {
      const query: QueryTeamsDto = {};
      const serviceResult = {
        data: [mockTeam, mockTeam],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      };
      mockTeamsService.findAll.mockResolvedValue(serviceResult);

      const result = await controller.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toMatchObject({ total: 2, page: 1, pageSize: 20, totalPages: 1 });
    });

    it('returns empty data array when no teams exist', async () => {
      const query: QueryTeamsDto = {};
      const serviceResult = {
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      };
      mockTeamsService.findAll.mockResolvedValue(serviceResult);

      const result = await controller.findAll(query);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('passes search param through to teamsService.findAll', async () => {
      const query: QueryTeamsDto = { search: 'West' };
      const serviceResult = {
        data: [mockTeam],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      };
      mockTeamsService.findAll.mockResolvedValue(serviceResult);

      await controller.findAll(query);

      expect(mockTeamsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET /teams/:id — findOne (JwtAuthGuard only, no RolesGuard)
  // -------------------------------------------------------------------------
  describe('GET /teams/:id (findOne)', () => {
    it('delegates to teamsService.findOne and returns { data: team }', async () => {
      mockTeamsService.findOne.mockResolvedValue(mockTeamDetailed);

      const result = await controller.findOne('team-1');

      expect(mockTeamsService.findOne).toHaveBeenCalledWith('team-1');
      expect(result).toEqual({ data: mockTeamDetailed });
    });

    it('propagates TEAM_NOT_FOUND NotFoundException from service', async () => {
      mockTeamsService.findOne.mockRejectedValue(
        new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' }),
      );

      await expect(controller.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // 3. POST /teams — create (201 Created)
  // -------------------------------------------------------------------------
  describe('POST /teams (create)', () => {
    it('delegates to teamsService.create and returns { data: team }', async () => {
      const dto: CreateTeamDto = {
        name: 'West Coast Sales',
        description: 'Covers CA, OR, WA',
        managerId: 'manager-1',
      };
      mockTeamsService.create.mockResolvedValue(mockTeam);

      const result = await controller.create(dto);

      expect(mockTeamsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockTeam });
    });

    it('propagates TEAM_NAME_DUPLICATE ConflictException from service', async () => {
      const dto: CreateTeamDto = { name: 'Existing Team' };
      mockTeamsService.create.mockRejectedValue(
        new ConflictException({ code: 'TEAM_NAME_DUPLICATE', message: 'Team name already in use' }),
      );

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('propagates MANAGER_NOT_FOUND BadRequestException from service', async () => {
      const dto: CreateTeamDto = { name: 'New Team', managerId: 'nonexistent-manager' };
      mockTeamsService.create.mockRejectedValue(
        new BadRequestException({ code: 'MANAGER_NOT_FOUND', message: 'Manager user not found' }),
      );

      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // 4. PATCH /teams/:id — update (200 OK)
  // -------------------------------------------------------------------------
  describe('PATCH /teams/:id (update)', () => {
    it('delegates to teamsService.update and returns { data: team }', async () => {
      const dto: UpdateTeamDto = { name: 'East Coast Sales' };
      const updatedTeam = { ...mockTeam, name: 'East Coast Sales' };
      mockTeamsService.update.mockResolvedValue(updatedTeam);

      const result = await controller.update('team-1', dto);

      expect(mockTeamsService.update).toHaveBeenCalledWith('team-1', dto);
      expect(result).toEqual({ data: updatedTeam });
    });

    it('propagates TEAM_NOT_FOUND NotFoundException from service', async () => {
      const dto: UpdateTeamDto = { name: 'Ghost Team' };
      mockTeamsService.update.mockRejectedValue(
        new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' }),
      );

      await expect(controller.update('missing-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('propagates TEAM_NAME_DUPLICATE ConflictException from service', async () => {
      const dto: UpdateTeamDto = { name: 'Duplicate Name' };
      mockTeamsService.update.mockRejectedValue(
        new ConflictException({ code: 'TEAM_NAME_DUPLICATE', message: 'Team name already in use' }),
      );

      await expect(controller.update('team-1', dto)).rejects.toThrow(ConflictException);
    });

    it('propagates MANAGER_NOT_FOUND BadRequestException from service', async () => {
      const dto: UpdateTeamDto = { managerId: 'nonexistent-manager' };
      mockTeamsService.update.mockRejectedValue(
        new BadRequestException({ code: 'MANAGER_NOT_FOUND', message: 'Manager user not found' }),
      );

      await expect(controller.update('team-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // 5. DELETE /teams/:id — delete (204 No Content)
  // -------------------------------------------------------------------------
  describe('DELETE /teams/:id (delete)', () => {
    it('delegates to teamsService.delete and returns void', async () => {
      mockTeamsService.delete.mockResolvedValue(undefined);

      const result = await controller.remove('team-1');

      expect(mockTeamsService.delete).toHaveBeenCalledWith('team-1');
      expect(result).toBeUndefined();
    });

    it('propagates TEAM_NOT_FOUND NotFoundException from service', async () => {
      mockTeamsService.delete.mockRejectedValue(
        new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' }),
      );

      await expect(controller.remove('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // 6. POST /teams/:id/members — addMembers (200 OK)
  // -------------------------------------------------------------------------
  describe('POST /teams/:id/members (addMembers)', () => {
    it('delegates to teamsService.addMembers and returns { data: team }', async () => {
      const dto: AddMembersDto = { userIds: ['user-1', 'user-2'] };
      mockTeamsService.addMembers.mockResolvedValue(mockTeamDetailed);

      const result = await controller.addMembers('team-1', dto);

      expect(mockTeamsService.addMembers).toHaveBeenCalledWith('team-1', dto);
      expect(result).toEqual({ data: mockTeamDetailed });
    });

    it('propagates TEAM_NOT_FOUND NotFoundException from service', async () => {
      const dto: AddMembersDto = { userIds: ['user-1'] };
      mockTeamsService.addMembers.mockRejectedValue(
        new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' }),
      );

      await expect(controller.addMembers('missing-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('passes multiple userIds through to teamsService.addMembers', async () => {
      const dto: AddMembersDto = { userIds: ['user-1', 'user-2', 'user-3'] };
      mockTeamsService.addMembers.mockResolvedValue(mockTeamDetailed);

      await controller.addMembers('team-1', dto);

      expect(mockTeamsService.addMembers).toHaveBeenCalledWith('team-1', dto);
    });
  });

  // -------------------------------------------------------------------------
  // 7. DELETE /teams/:id/members/:userId — removeMember (204 No Content)
  // -------------------------------------------------------------------------
  describe('DELETE /teams/:id/members/:userId (removeMember)', () => {
    it('delegates to teamsService.removeMember and returns void', async () => {
      mockTeamsService.removeMember.mockResolvedValue(undefined);

      const result = await controller.removeMember('team-1', 'user-1');

      expect(mockTeamsService.removeMember).toHaveBeenCalledWith('team-1', 'user-1');
      expect(result).toBeUndefined();
    });

    it('propagates TEAM_NOT_FOUND NotFoundException from service', async () => {
      mockTeamsService.removeMember.mockRejectedValue(
        new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' }),
      );

      await expect(controller.removeMember('missing-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('propagates MEMBER_NOT_FOUND NotFoundException from service', async () => {
      mockTeamsService.removeMember.mockRejectedValue(
        new NotFoundException({ code: 'MEMBER_NOT_FOUND', message: 'User is not a member of this team' }),
      );

      await expect(controller.removeMember('team-1', 'nonmember-id')).rejects.toThrow(NotFoundException);
    });
  });
});
