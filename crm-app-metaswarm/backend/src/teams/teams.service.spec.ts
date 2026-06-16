import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { AddMembersDto } from './dto/add-members.dto';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  team: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  teamMember: {
    findUnique: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn().mockImplementation(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return (ops as (client: typeof mockPrisma) => Promise<unknown>)(mockPrisma);
  }),
};

// ---------------------------------------------------------------------------
// Shared fixture builders
// ---------------------------------------------------------------------------

const mockManager = { id: 'manager-1', firstName: 'Alice', lastName: 'Smith' };
const mockUser1 = { id: 'user-1', firstName: 'Bob', lastName: 'Jones' };

function buildTeam(
  overrides: Partial<{
    id: string;
    name: string;
    description: string | null;
    managerId: string | null;
    manager: object | null;
    deletedAt: Date | null;
    _count: { members: number };
    members: object[];
  }> = {},
) {
  return {
    id: 'team-1',
    name: 'Alpha Squad',
    description: 'Our best team',
    managerId: 'manager-1',
    manager: mockManager,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    _count: { members: 1 },
    ...overrides,
  };
}

function buildTeamWithMembers(
  overrides: Partial<{
    id: string;
    name: string;
    manager: object | null;
    members: object[];
    deletedAt: Date | null;
  }> = {},
) {
  return {
    id: 'team-1',
    name: 'Alpha Squad',
    description: 'Our best team',
    managerId: 'manager-1',
    manager: mockManager,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    members: [
      {
        userId: 'user-1',
        teamId: 'team-1',
        user: { ...mockUser1, role: { id: 'role-1', name: 'SALES_REPRESENTATIVE' } },
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset the $transaction mock after clearAllMocks
    mockPrisma.$transaction.mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return (ops as (client: typeof mockPrisma) => Promise<unknown>)(mockPrisma);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    const baseQuery: QueryTeamsDto = { page: 1, pageSize: 20, sortOrder: 'asc' };

    beforeEach(() => {
      mockPrisma.team.findMany.mockResolvedValue([buildTeam()]);
      mockPrisma.team.count.mockResolvedValue(1);
    });

    it('should return paginated teams with meta', async () => {
      const result = await service.findAll(baseQuery);

      expect(result).toEqual({
        data: [buildTeam()],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      });
      expect(mockPrisma.team.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.team.count).toHaveBeenCalledTimes(1);
    });

    it('should filter by deletedAt null always', async () => {
      await service.findAll(baseQuery);

      const findManyCall = mockPrisma.team.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(findManyCall.where).toMatchObject({ deletedAt: null });
    });

    it('should apply name ILIKE search filter when search is provided', async () => {
      const query: QueryTeamsDto = { ...baseQuery, search: 'alpha' };

      await service.findAll(query);

      const findManyCall = mockPrisma.team.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(findManyCall.where).toMatchObject({
        name: { contains: 'alpha', mode: 'insensitive' },
      });
    });

    it('should apply sortBy name when provided', async () => {
      const query: QueryTeamsDto = { ...baseQuery, sortBy: 'name', sortOrder: 'desc' };

      await service.findAll(query);

      const findManyCall = mockPrisma.team.findMany.mock.calls[0][0] as {
        orderBy: Record<string, unknown>;
      };
      expect(findManyCall.orderBy).toEqual({ name: 'desc' });
    });

    it('should apply sortBy createdAt when provided', async () => {
      const query: QueryTeamsDto = { ...baseQuery, sortBy: 'createdAt', sortOrder: 'asc' };

      await service.findAll(query);

      const findManyCall = mockPrisma.team.findMany.mock.calls[0][0] as {
        orderBy: Record<string, unknown>;
      };
      expect(findManyCall.orderBy).toEqual({ createdAt: 'asc' });
    });

    it('should default orderBy to name asc when sortBy is omitted', async () => {
      await service.findAll(baseQuery);

      const findManyCall = mockPrisma.team.findMany.mock.calls[0][0] as {
        orderBy: Record<string, unknown>;
      };
      expect(findManyCall.orderBy).toEqual({ name: 'asc' });
    });

    it('should compute correct totalPages', async () => {
      mockPrisma.team.count.mockResolvedValue(45);
      const query: QueryTeamsDto = { ...baseQuery, pageSize: 20 };

      const result = await service.findAll(query);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should apply correct pagination skip and take', async () => {
      const query: QueryTeamsDto = { ...baseQuery, page: 3, pageSize: 10 };

      await service.findAll(query);

      const findManyCall = mockPrisma.team.findMany.mock.calls[0][0] as {
        skip: number;
        take: number;
      };
      expect(findManyCall.skip).toBe(20);
      expect(findManyCall.take).toBe(10);
    });

    it('should include manager and _count.members in include clause', async () => {
      await service.findAll(baseQuery);

      const findManyCall = mockPrisma.team.findMany.mock.calls[0][0] as {
        include: Record<string, unknown>;
      };
      expect(findManyCall.include).toMatchObject({
        manager: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      });
    });

    it('uses default page=1, pageSize=20, sortOrder=asc when query is empty', async () => {
      await service.findAll({});

      const findManyCall = mockPrisma.team.findMany.mock.calls[0][0] as {
        skip: number;
        take: number;
        orderBy: Record<string, string>;
      };
      expect(findManyCall.skip).toBe(0);
      expect(findManyCall.take).toBe(20);
      expect(findManyCall.orderBy).toEqual({ name: 'asc' });
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  describe('findOne', () => {
    it('should return a team with full member list', async () => {
      const team = buildTeamWithMembers();
      mockPrisma.team.findUnique.mockResolvedValue(team);

      const result = await service.findOne('team-1');

      expect(result).toEqual(team);
    });

    it('should throw TEAM_NOT_FOUND (404) when team does not exist', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      await expect(service.findOne('no-such-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('no-such-id')).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should throw TEAM_NOT_FOUND (404) when team is soft-deleted', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(
        buildTeamWithMembers({ deletedAt: new Date() }),
      );

      await expect(service.findOne('team-1')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('team-1')).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should include members with user details in the query', async () => {
      const team = buildTeamWithMembers();
      mockPrisma.team.findUnique.mockResolvedValue(team);

      await service.findOne('team-1');

      const findUniqueCall = mockPrisma.team.findUnique.mock.calls[0][0] as {
        include: Record<string, unknown>;
      };
      expect(findUniqueCall.include).toMatchObject({
        manager: { select: { id: true, firstName: true, lastName: true } },
        members: { include: { user: { include: { role: true } } } },
      });
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    const dto: CreateTeamDto = {
      name: 'Beta Squad',
      description: 'A new team',
      managerId: 'manager-1',
    };

    beforeEach(() => {
      mockPrisma.team.findFirst.mockResolvedValue(null); // no duplicate name
      mockPrisma.user.findUnique.mockResolvedValue(mockManager);
      mockPrisma.team.create.mockResolvedValue(buildTeam({ name: dto.name }));
    });

    it('should create a team and return the created record', async () => {
      const result = await service.create(dto);

      expect(mockPrisma.team.create).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should throw TEAM_NAME_DUPLICATE (409) when name already exists', async () => {
      mockPrisma.team.findFirst.mockResolvedValue(buildTeam());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toMatchObject({
        response: { code: 'TEAM_NAME_DUPLICATE' },
      });
    });

    it('should throw MANAGER_NOT_FOUND (400) when managerId does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toMatchObject({
        response: { code: 'MANAGER_NOT_FOUND' },
      });
    });

    it('should not check managerId when managerId is not provided', async () => {
      const dtoNoManager: CreateTeamDto = { name: 'Solo Team' };
      mockPrisma.team.create.mockResolvedValue(
        buildTeam({ name: 'Solo Team', managerId: null, manager: null }),
      );

      await service.create(dtoNoManager);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should create team with correct data including manager', async () => {
      await service.create(dto);

      const createCall = mockPrisma.team.create.mock.calls[0][0] as {
        data: { name: string; description: string | undefined; managerId: string | undefined };
      };
      expect(createCall.data).toMatchObject({
        name: 'Beta Squad',
        description: 'A new team',
        managerId: 'manager-1',
      });
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    const dto: UpdateTeamDto = { name: 'Updated Squad', managerId: 'manager-1' };

    beforeEach(() => {
      mockPrisma.team.findUnique.mockResolvedValue(buildTeam());
      mockPrisma.team.findFirst.mockResolvedValue(null); // no name conflict
      mockPrisma.user.findUnique.mockResolvedValue(mockManager);
      mockPrisma.team.update.mockResolvedValue(buildTeam({ name: 'Updated Squad' }));
    });

    it('should update a team and return the updated record', async () => {
      const result = await service.update('team-1', dto);

      expect(mockPrisma.team.update).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should throw TEAM_NOT_FOUND (404) when team does not exist', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      await expect(service.update('no-such-id', dto)).rejects.toThrow(NotFoundException);
      await expect(service.update('no-such-id', dto)).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should throw TEAM_NOT_FOUND (404) when team is soft-deleted', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(buildTeam({ deletedAt: new Date() }));

      await expect(service.update('team-1', dto)).rejects.toThrow(NotFoundException);
      await expect(service.update('team-1', dto)).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should throw TEAM_NAME_DUPLICATE (409) when new name conflicts with another team', async () => {
      mockPrisma.team.findFirst.mockResolvedValue(buildTeam({ id: 'team-999', name: 'Updated Squad' }));

      await expect(service.update('team-1', dto)).rejects.toThrow(ConflictException);
      await expect(service.update('team-1', dto)).rejects.toMatchObject({
        response: { code: 'TEAM_NAME_DUPLICATE' },
      });
    });

    it('should throw MANAGER_NOT_FOUND (400) when managerId does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('team-1', dto)).rejects.toThrow(BadRequestException);
      await expect(service.update('team-1', dto)).rejects.toMatchObject({
        response: { code: 'MANAGER_NOT_FOUND' },
      });
    });

    it('should not check managerId when managerId is not in update dto', async () => {
      const dtoNoManager: UpdateTeamDto = { name: 'New Name Only' };

      await service.update('team-1', dtoNoManager);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should not check name conflict when name is not being changed', async () => {
      const dtoSameName: UpdateTeamDto = { name: 'Alpha Squad' }; // same as existing
      mockPrisma.team.update.mockResolvedValue(buildTeam());

      await service.update('team-1', dtoSameName);

      // findFirst for name uniqueness should NOT be called (same name, same team)
      expect(mockPrisma.team.findFirst).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    beforeEach(() => {
      mockPrisma.team.findUnique.mockResolvedValue(buildTeam());
      mockPrisma.team.update.mockResolvedValue(buildTeam({ deletedAt: new Date() }));
      mockPrisma.teamMember.deleteMany.mockResolvedValue({ count: 1 });
    });

    it('should soft-delete the team and delete all its members in a transaction', async () => {
      await service.delete('team-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should set deletedAt on the team', async () => {
      await service.delete('team-1');

      expect(mockPrisma.team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'team-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should deleteMany TeamMember rows for the teamId', async () => {
      await service.delete('team-1');

      expect(mockPrisma.teamMember.deleteMany).toHaveBeenCalledWith({
        where: { teamId: 'team-1' },
      });
    });

    it('should throw TEAM_NOT_FOUND (404) when team does not exist', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      await expect(service.delete('no-such-id')).rejects.toThrow(NotFoundException);
      await expect(service.delete('no-such-id')).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should throw TEAM_NOT_FOUND (404) when team is already soft-deleted', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(buildTeam({ deletedAt: new Date() }));

      await expect(service.delete('team-1')).rejects.toThrow(NotFoundException);
      await expect(service.delete('team-1')).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // addMembers
  // -------------------------------------------------------------------------

  describe('addMembers', () => {
    const dto: AddMembersDto = { userIds: ['user-1', 'user-2'] };

    beforeEach(() => {
      mockPrisma.team.findUnique.mockResolvedValue(buildTeam());
      mockPrisma.teamMember.createMany.mockResolvedValue({ count: 2 });
      // second findUnique call (for the findOne return) returns full team with members
      mockPrisma.team.findUnique
        .mockResolvedValueOnce(buildTeam())
        .mockResolvedValueOnce(buildTeamWithMembers());
    });

    it('should add members and return the updated team', async () => {
      const result = await service.addMembers('team-1', dto);

      expect(mockPrisma.teamMember.createMany).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should call createMany with skipDuplicates=true (idempotent)', async () => {
      await service.addMembers('team-1', dto);

      expect(mockPrisma.teamMember.createMany).toHaveBeenCalledWith({
        data: [
          { teamId: 'team-1', userId: 'user-1' },
          { teamId: 'team-1', userId: 'user-2' },
        ],
        skipDuplicates: true,
      });
    });

    it('should throw TEAM_NOT_FOUND (404) when team does not exist', async () => {
      mockPrisma.team.findUnique.mockReset();
      mockPrisma.team.findUnique.mockResolvedValue(null);

      await expect(service.addMembers('no-such-id', dto)).rejects.toThrow(NotFoundException);
      await expect(service.addMembers('no-such-id', dto)).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should throw TEAM_NOT_FOUND (404) when team is soft-deleted', async () => {
      mockPrisma.team.findUnique.mockReset();
      mockPrisma.team.findUnique.mockResolvedValue(buildTeam({ deletedAt: new Date() }));

      await expect(service.addMembers('team-1', dto)).rejects.toThrow(NotFoundException);
      await expect(service.addMembers('team-1', dto)).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should not error when duplicate userIds are provided (skipDuplicates)', async () => {
      const dtoWithDuplicates: AddMembersDto = { userIds: ['user-1', 'user-1'] };

      // Should NOT throw — skipDuplicates handles it
      await expect(service.addMembers('team-1', dtoWithDuplicates)).resolves.toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // removeMember
  // -------------------------------------------------------------------------

  describe('removeMember', () => {
    beforeEach(() => {
      mockPrisma.team.findUnique.mockResolvedValue(buildTeam());
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        teamId: 'team-1',
      });
      mockPrisma.teamMember.delete.mockResolvedValue({
        userId: 'user-1',
        teamId: 'team-1',
      });
    });

    it('should remove a member from the team', async () => {
      await service.removeMember('team-1', 'user-1');

      expect(mockPrisma.teamMember.delete).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: 'user-1', teamId: 'team-1' } },
      });
    });

    it('should throw TEAM_NOT_FOUND (404) when team does not exist', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      await expect(service.removeMember('no-such-id', 'user-1')).rejects.toThrow(NotFoundException);
      await expect(service.removeMember('no-such-id', 'user-1')).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should throw TEAM_NOT_FOUND (404) when team is soft-deleted', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(buildTeam({ deletedAt: new Date() }));

      await expect(service.removeMember('team-1', 'user-1')).rejects.toThrow(NotFoundException);
      await expect(service.removeMember('team-1', 'user-1')).rejects.toMatchObject({
        response: { code: 'TEAM_NOT_FOUND' },
      });
    });

    it('should throw MEMBER_NOT_FOUND (404) when user is not a member of the team', async () => {
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);

      await expect(service.removeMember('team-1', 'user-999')).rejects.toThrow(NotFoundException);
      await expect(service.removeMember('team-1', 'user-999')).rejects.toMatchObject({
        response: { code: 'MEMBER_NOT_FOUND' },
      });
    });
  });
});
