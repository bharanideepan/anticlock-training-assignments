import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignTeamsDto } from './dto/assign-teams.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { paginate } from '../../common/pagination/paginated-result';
import { PasswordResetTokenService } from '../auth/services/password-reset-token.service';
import { RefreshTokenService } from '../auth/services/refresh-token.service';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  jobTitle: true,
  status: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
  teams: { select: { team: { select: { id: true, name: true } } } },
} as const;

function mapUser(u: any) {
  return { ...u, teams: u.teams.map((t: any) => t.team) };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
  ) {}

  async findAll(filter: UserFilterDto) {
    const where: any = {};

    if (filter.search) {
      const s = filter.search;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (filter.roleId) where.roleId = filter.roleId;
    if (filter.status) where.status = filter.status;
    if (filter.teamId) {
      where.teams = { some: { teamId: filter.teamId } };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { [filter.sortBy ?? 'createdAt']: filter.sortOrder },
        skip: filter.skip,
        take: filter.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(data.map(mapUser), total, filter.page, filter.pageSize);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return mapUser(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('EMAIL_ALREADY_EXISTS');

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');

    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        passwordHash,
        roleId: dto.roleId,
        teams: dto.teamIds
          ? { create: dto.teamIds.map((teamId) => ({ teamId })) }
          : undefined,
      },
      select: USER_SELECT,
    });

    // Send activation / password-reset email so user sets their own password
    await this.passwordResetTokenService
      .createAndSend(dto.email)
      .catch(() => null);

    return mapUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
    return mapUser(user);
  }

  async deactivate(id: string, actorId: string) {
    if (id === actorId) throw new ConflictException('CANNOT_DEACTIVATE_SELF');
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    await this.refreshTokenService.revoke(id);
  }

  async reactivate(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async adminResetPassword(id: string) {
    const user = await this.findOne(id);
    await this.passwordResetTokenService.createAndSend(user.email);
  }

  async assignRole(id: string, dto: AssignRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');

    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { roleId: dto.roleId },
      select: USER_SELECT,
    });
    await this.refreshTokenService.revoke(id);
    return mapUser(user);
  }

  async assignTeams(id: string, dto: AssignTeamsDto) {
    await this.findOne(id);
    await this.prisma.teamMember.deleteMany({ where: { userId: id } });
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        teams: { create: dto.teamIds.map((teamId) => ({ teamId })) },
      },
      select: USER_SELECT,
    });
    return mapUser(user);
  }
}
