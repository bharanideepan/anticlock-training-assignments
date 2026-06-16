import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuditAction, RoleName, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateTeamsDto } from './dto/update-teams.dto';
import { QueryUsersDto } from './dto/query-users.dto';

/** Prisma include clause used on every user fetch — keeps relation shape consistent. */
const USER_INCLUDE = {
  role: true,
  teamMemberships: { include: { team: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Return a paginated, filtered list of users.
   *
   * SALES_MANAGER visibility is scoped to their own teams via actorTeamIds.
   * SYSTEM_ADMINISTRATOR (and all other roles) see all users.
   */
  async findAll(
    query: QueryUsersDto,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const {
      page = 1,
      pageSize = 20,
      search,
      roleId,
      teamId,
      status,
      sortBy,
      sortOrder = 'asc',
    } = query;

    // Build filter conditions
    const where: Record<string, unknown> = {};

    if (search) {
      where['OR'] = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) {
      where['roleId'] = roleId;
    }

    if (teamId) {
      where['teamMemberships'] = { some: { teamId } };
    }

    if (status) {
      where['status'] = status;
    }

    // SALES_MANAGER can only see users in their own teams
    if (actorRole === RoleName.SALES_MANAGER) {
      where['teamMemberships'] = { some: { teamId: { in: actorTeamIds } } };
    }

    const orderBy = { [sortBy ?? 'createdAt']: sortOrder };
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        orderBy,
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Retrieve a single user by id.
   *
   * SALES_MANAGER can only view users that belong to one of their teams.
   */
  async findOne(id: string, actorRole: RoleName, actorTeamIds: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    if (actorRole === RoleName.SALES_MANAGER) {
      const targetTeamIds = user.teamMemberships.map((m) => m.teamId);
      const hasOverlap = actorTeamIds.some((tid) => targetTeamIds.includes(tid));
      if (!hasOverlap) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
      }
    }

    return user;
  }

  /**
   * Create a new user, validate email uniqueness and role existence,
   * then trigger an activation email via authService.requestPasswordReset.
   */
  async create(dto: CreateUserDto) {
    const { email, firstName, lastName, phone, jobTitle, roleId, teamIds = [] } = dto;

    // Validate email uniqueness
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email already in use',
      });
    }

    // Validate role
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        jobTitle,
        roleId,
        teamMemberships: {
          createMany: {
            data: teamIds.map((teamId) => ({ teamId })),
          },
        },
      },
      include: USER_INCLUDE,
    });

    // Send activation / password-set link
    await this.authService.requestPasswordReset(email);

    return user;
  }

  /**
   * Update mutable profile fields (name, phone, jobTitle).
   */
  async update(id: string, dto: UpdateUserDto) {
    await this.findExistingUser(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: USER_INCLUDE,
    });
  }

  /**
   * Deactivate a user: set status INACTIVE, revoke tokens, write audit log.
   * An actor cannot deactivate their own account.
   */
  async deactivate(id: string, actorId: string) {
    await this.findExistingUser(id);

    if (id === actorId) {
      throw new ConflictException({
        code: 'CANNOT_DEACTIVATE_SELF',
        message: 'Cannot deactivate own account',
      });
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });

    await this.authService.revokeAllUserTokens(id);

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.STATUS_CHANGED,
        resourceType: 'User',
        resourceId: id,
      },
    });
  }

  /**
   * Reactivate a previously deactivated user and write an audit log entry.
   */
  async reactivate(id: string) {
    await this.findExistingUser(id);

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.STATUS_CHANGED,
        resourceType: 'User',
        resourceId: id,
      },
    });
  }

  /**
   * Trigger a password-reset email for the user (admin-initiated).
   */
  async adminResetPassword(id: string) {
    const user = await this.findExistingUser(id);
    await this.authService.requestPasswordReset(user.email);
  }

  /**
   * Change a user's role, revoke their existing tokens so the new role takes
   * effect on the next login, and write a ROLE_CHANGED audit log entry.
   */
  async updateRole(id: string, dto: UpdateRoleDto) {
    await this.findExistingUser(id);

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { roleId: dto.roleId },
      include: USER_INCLUDE,
    });

    await this.authService.revokeAllUserTokens(id);

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.ROLE_CHANGED,
        resourceType: 'User',
        resourceId: id,
      },
    });

    return updated;
  }

  /**
   * Replace a user's full team membership list atomically using a transaction:
   * delete all existing memberships then recreate with the provided teamIds.
   */
  async updateTeams(id: string, dto: UpdateTeamsDto) {
    await this.findExistingUser(id);

    await this.prisma.$transaction([
      this.prisma.teamMember.deleteMany({ where: { userId: id } }),
      this.prisma.teamMember.createMany({
        data: dto.teamIds.map((teamId) => ({ userId: id, teamId })),
        skipDuplicates: true,
      }),
    ]);

    return this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Fetch a user by id or throw USER_NOT_FOUND. Used internally before mutations. */
  private async findExistingUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return user;
  }
}
