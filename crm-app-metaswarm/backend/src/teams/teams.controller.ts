import {
  Body,
  Controller,
  Delete,
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
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMembersDto } from './dto/add-members.dto';

/** Paginated meta block returned by teamsService.findAll */
interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * GET /teams
   * Returns a paginated list of teams.
   * Accessible to all authenticated users — no role restriction.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() query: QueryTeamsDto,
  ): Promise<{ data: unknown[]; meta: PageMeta }> {
    const result = await this.teamsService.findAll(query);
    return { data: result.data, meta: result.meta };
  }

  /**
   * GET /teams/:id
   * Retrieve a single team by id including its members.
   * Accessible to all authenticated users — no role restriction.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<{ data: unknown }> {
    const team = await this.teamsService.findOne(id);
    return { data: team };
  }

  /**
   * POST /teams
   * Create a new team.
   * Response: 201 Created
   * Restricted to SYSTEM_ADMINISTRATOR.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async create(@Body() dto: CreateTeamDto): Promise<{ data: unknown }> {
    const team = await this.teamsService.create(dto);
    return { data: team };
  }

  /**
   * PATCH /teams/:id
   * Update mutable team fields (name, description, managerId).
   * Response: 200 OK
   * Restricted to SYSTEM_ADMINISTRATOR.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<{ data: unknown }> {
    const team = await this.teamsService.update(id, dto);
    return { data: team };
  }

  /**
   * DELETE /teams/:id
   * Soft-delete a team and cascade-delete all TeamMember rows.
   * Response: 204 No Content
   * Restricted to SYSTEM_ADMINISTRATOR.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async remove(@Param('id') id: string): Promise<void> {
    await this.teamsService.delete(id);
  }

  /**
   * POST /teams/:id/members
   * Add one or more members to a team. Duplicate memberships are silently skipped.
   * Response: 200 OK with the updated team detail.
   * Restricted to SYSTEM_ADMINISTRATOR.
   */
  @Post(':id/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async addMembers(
    @Param('id') id: string,
    @Body() dto: AddMembersDto,
  ): Promise<{ data: unknown }> {
    const team = await this.teamsService.addMembers(id, dto);
    return { data: team };
  }

  /**
   * DELETE /teams/:id/members/:userId
   * Remove a single member from a team.
   * Response: 204 No Content
   * Restricted to SYSTEM_ADMINISTRATOR.
   */
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.teamsService.removeMember(id, userId);
  }
}
