import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { AddMembersDto } from './dto/add-members.dto';

// ---------------------------------------------------------------------------
// Include shapes for reuse across methods
// ---------------------------------------------------------------------------

const TEAM_LIST_INCLUDE = {
  manager: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { members: true } },
} as const;

const TEAM_DETAIL_INCLUDE = {
  manager: { select: { id: true, firstName: true, lastName: true } },
  members: { include: { user: { include: { role: true } } } },
} as const;

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  async findAll(query: QueryTeamsDto) {
    const {
      page = 1,
      pageSize = 20,
      search,
      sortBy,
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where['name'] = { contains: search, mode: 'insensitive' };
    }

    const orderBy: Record<string, string> = sortBy
      ? { [sortBy]: sortOrder }
      : { name: sortOrder };

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        include: TEAM_LIST_INCLUDE,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.team.count({ where }),
    ]);

    return {
      data: teams,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: TEAM_DETAIL_INCLUDE,
    });

    if (!team || team.deletedAt !== null) {
      throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' });
    }

    return team;
  }

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  async create(dto: CreateTeamDto) {
    const { name, description, managerId } = dto;

    // Check name uniqueness among non-deleted teams
    const existing = await this.prisma.team.findFirst({
      where: { name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        code: 'TEAM_NAME_DUPLICATE',
        message: 'Team name already in use',
      });
    }

    // Validate manager exists when managerId is provided
    if (managerId) {
      const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
      if (!manager) {
        throw new BadRequestException({
          code: 'MANAGER_NOT_FOUND',
          message: 'Manager user not found',
        });
      }
    }

    return this.prisma.team.create({
      data: { name, description, managerId },
      include: TEAM_LIST_INCLUDE,
    });
  }

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  async update(id: string, dto: UpdateTeamDto) {
    const { name, managerId } = dto;

    const team = await this.prisma.team.findUnique({ where: { id } });

    if (!team || team.deletedAt !== null) {
      throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' });
    }

    // Check name uniqueness only when the name is actually changing
    if (name && name !== team.name) {
      const conflict = await this.prisma.team.findFirst({
        where: { name, deletedAt: null },
      });
      if (conflict) {
        throw new ConflictException({
          code: 'TEAM_NAME_DUPLICATE',
          message: 'Team name already in use',
        });
      }
    }

    // Validate manager when managerId is provided
    if (managerId) {
      const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
      if (!manager) {
        throw new BadRequestException({
          code: 'MANAGER_NOT_FOUND',
          message: 'Manager user not found',
        });
      }
    }

    return this.prisma.team.update({
      where: { id },
      data: dto,
      include: TEAM_LIST_INCLUDE,
    });
  }

  // -------------------------------------------------------------------------
  // delete (soft-delete + cascade-delete TeamMember rows)
  // -------------------------------------------------------------------------

  async delete(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });

    if (!team || team.deletedAt !== null) {
      throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' });
    }

    // Perform both operations inside a transaction
    await this.prisma.$transaction([
      this.prisma.team.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.teamMember.deleteMany({ where: { teamId: id } }),
    ]);
  }

  // -------------------------------------------------------------------------
  // addMembers
  // -------------------------------------------------------------------------

  async addMembers(teamId: string, dto: AddMembersDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team || team.deletedAt !== null) {
      throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' });
    }

    await this.prisma.teamMember.createMany({
      data: dto.userIds.map((userId) => ({ teamId, userId })),
      skipDuplicates: true,
    });

    return this.findOne(teamId);
  }

  // -------------------------------------------------------------------------
  // removeMember
  // -------------------------------------------------------------------------

  async removeMember(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team || team.deletedAt !== null) {
      throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' });
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'User is not a member of this team',
      });
    }

    await this.prisma.teamMember.delete({
      where: { userId_teamId: { userId, teamId } },
    });
  }
}
