import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateTeamsDto } from './dto/update-teams.dto';

/** Shape of the JWT payload injected by @CurrentUser() */
interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

/** Paginated meta block returned by usersService.findAll */
interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users
   * Returns a paginated list of users.
   * SALES_MANAGER visibility is scoped to their own teams by the service layer.
   */
  @Get()
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  async findAll(
    @Query() query: QueryUsersDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown[]; meta: PageMeta }> {
    const result = await this.usersService.findAll(query, actor.role, actor.teamIds);
    return { data: result.data, meta: result.meta };
  }

  /**
   * POST /users
   * Create a new user account and trigger an activation email.
   * Response: 201 Created
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async create(@Body() dto: CreateUserDto): Promise<{ data: unknown }> {
    const user = await this.usersService.create(dto);
    return { data: user };
  }

  /**
   * GET /users/:id
   * Retrieve a single user by id.
   * SALES_MANAGER can only view users within their teams.
   */
  @Get(':id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const user = await this.usersService.findOne(id, actor.role, actor.teamIds);
    return { data: user };
  }

  /**
   * PATCH /users/:id
   * Update mutable profile fields (name, phone, jobTitle).
   * Response: 200 OK
   */
  @Patch(':id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<{ data: unknown }> {
    const user = await this.usersService.update(id, dto);
    return { data: user };
  }

  /**
   * POST /users/:id/deactivate
   * Deactivate a user account. An actor cannot deactivate their own account.
   * Response: 204 No Content
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<void> {
    await this.usersService.deactivate(id, actor.sub);
  }

  /**
   * POST /users/:id/reactivate
   * Reactivate a previously deactivated user account.
   * Response: 204 No Content
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async reactivate(@Param('id') id: string): Promise<void> {
    await this.usersService.reactivate(id);
  }

  /**
   * POST /users/:id/reset-password
   * Admin-initiated password reset — sends a reset email to the user.
   * Response: 202 Accepted
   */
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async adminResetPassword(@Param('id') id: string): Promise<void> {
    await this.usersService.adminResetPassword(id);
  }

  /**
   * PATCH /users/:id/role
   * Change a user's role. Revokes existing tokens so the new role takes effect on
   * the next login.
   * Response: 200 OK
   */
  @Patch(':id/role')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<{ data: unknown }> {
    const user = await this.usersService.updateRole(id, dto);
    return { data: user };
  }

  /**
   * PATCH /users/:id/teams
   * Replace a user's full team membership list atomically.
   * Response: 200 OK
   */
  @Patch(':id/teams')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async updateTeams(
    @Param('id') id: string,
    @Body() dto: UpdateTeamsDto,
  ): Promise<{ data: unknown }> {
    const user = await this.usersService.updateTeams(id, dto);
    return { data: user };
  }
}
