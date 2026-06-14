import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { PageOptionsDto } from '../../common/pagination/page-options.dto';
import { paginate } from '../../common/pagination/paginated-result';

const TEAM_SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  manager: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { members: true } },
} as const;

const TEAM_DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  manager: { select: { id: true, firstName: true, lastName: true } },
  members: {
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
        },
      },
    },
  },
} as const;

function mapTeam(t: any) {
  return {
    ...t,
    memberCount: t._count?.members ?? undefined,
    _count: undefined,
  };
}

function mapTeamDetail(t: any) {
  return { ...t, members: t.members.map((m: any) => m.user) };
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(opts: PageOptionsDto) {
    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        select: TEAM_SELECT,
        orderBy: { [opts.sortBy ?? 'createdAt']: opts.sortOrder },
        skip: opts.skip,
        take: opts.pageSize,
      }),
      this.prisma.team.count(),
    ]);
    return paginate(data.map(mapTeam), total, opts.page, opts.pageSize);
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      select: TEAM_DETAIL_SELECT,
    });
    if (!team) throw new NotFoundException('TEAM_NOT_FOUND');
    return mapTeamDetail(team);
  }

  async create(dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
        managerId: dto.managerId,
      },
      select: TEAM_DETAIL_SELECT,
    });
    return mapTeamDetail(team);
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);
    const team = await this.prisma.team.update({
      where: { id },
      data: dto,
      select: TEAM_DETAIL_SELECT,
    });
    return mapTeamDetail(team);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.teamMember.deleteMany({ where: { teamId: id } });
    await this.prisma.team.delete({ where: { id } });
  }

  async addMembers(id: string, dto: AddMembersDto) {
    await this.findOne(id);
    await this.prisma.teamMember.createMany({
      data: dto.userIds.map((userId) => ({ teamId: id, userId })),
      skipDuplicates: true,
    });
    const team = await this.prisma.team.findUnique({
      where: { id },
      select: TEAM_DETAIL_SELECT,
    });
    return mapTeamDetail(team!);
  }

  async removeMember(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.teamMember.deleteMany({ where: { teamId: id, userId } });
  }
}
