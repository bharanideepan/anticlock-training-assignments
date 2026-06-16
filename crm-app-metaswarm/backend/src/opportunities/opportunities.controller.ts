import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
// Controller() with empty path so route methods define their own full paths
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { OpportunitiesService } from './opportunities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { CloseOpportunityDto } from './dto/close-opportunity.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

interface ActorPayload { sub: string; email: string; role: RoleName; teamIds: string[] }

const ALL_ROLES = [RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER, RoleName.SALES_REPRESENTATIVE, RoleName.SUPPORT_REPRESENTATIVE, RoleName.READ_ONLY];
const WRITE_ROLES = [RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER, RoleName.SALES_REPRESENTATIVE];
const ADMIN_ONLY = [RoleName.SYSTEM_ADMINISTRATOR];

@ApiTags('opportunities')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OpportunitiesController {
  constructor(private readonly svc: OpportunitiesService) {}

  // Opportunities
  @Get('opportunities')
  @Roles(...ALL_ROLES)
  async findAll(@Query() query: QueryOpportunitiesDto, @CurrentUser() actor: ActorPayload) {
    return this.svc.findAll(query, actor.sub, actor.role, actor.teamIds);
  }

  @Post('opportunities')
  @HttpCode(HttpStatus.CREATED)
  @Roles(...WRITE_ROLES)
  async create(@Body() dto: CreateOpportunityDto, @CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    return { data: await this.svc.create(dto, actor.sub, actor.role, actor.teamIds) };
  }

  @Get('opportunities/:id')
  @Roles(...ALL_ROLES)
  async findOne(@Param('id') id: string, @CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    return { data: await this.svc.findOne(id, actor.sub, actor.role, actor.teamIds) };
  }

  @Patch('opportunities/:id')
  @Roles(...WRITE_ROLES)
  async update(@Param('id') id: string, @Body() dto: UpdateOpportunityDto, @CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    return { data: await this.svc.update(id, dto, actor.sub, actor.role, actor.teamIds) };
  }

  @Patch('opportunities/:id/stage')
  @Roles(...WRITE_ROLES)
  async moveStage(@Param('id') id: string, @Body() dto: MoveStageDto, @CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    return { data: await this.svc.moveStage(id, dto, actor.sub, actor.role, actor.teamIds) };
  }

  @Post('opportunities/:id/close/won')
  @HttpCode(HttpStatus.OK)
  @Roles(...WRITE_ROLES)
  async closeWon(@Param('id') id: string, @Body() dto: CloseOpportunityDto, @CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    return { data: await this.svc.closeWon(id, dto, actor.sub, actor.role, actor.teamIds) };
  }

  @Post('opportunities/:id/close/lost')
  @HttpCode(HttpStatus.OK)
  @Roles(...WRITE_ROLES)
  async closeLost(@Param('id') id: string, @Body() dto: CloseOpportunityDto, @CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    return { data: await this.svc.closeLost(id, dto, actor.sub, actor.role, actor.teamIds) };
  }

  // Pipeline board
  @Get('pipeline')
  @Roles(...ALL_ROLES)
  async getBoard(
    @Query() query: { ownerId?: string; search?: string; closeDateFrom?: string; closeDateTo?: string },
    @CurrentUser() actor: ActorPayload,
  ) {
    return this.svc.getPipelineBoard(query, actor.sub, actor.role, actor.teamIds);
  }

  // Pipeline stages
  @Get('pipeline/stages')
  @Roles(...ALL_ROLES)
  async getStages(): Promise<{ data: unknown }> {
    return { data: await this.svc.getStages() };
  }

  @Post('pipeline/stages')
  @HttpCode(HttpStatus.CREATED)
  @Roles(...ADMIN_ONLY)
  async createStage(@Body() dto: CreateStageDto): Promise<{ data: unknown }> {
    return { data: await this.svc.createStage(dto) };
  }

  @Patch('pipeline/stages/reorder')
  @Roles(...ADMIN_ONLY)
  async reorderStages(@Body() dto: ReorderStagesDto): Promise<{ data: unknown }> {
    return { data: await this.svc.reorderStages(dto) };
  }

  @Patch('pipeline/stages/:id')
  @Roles(...ADMIN_ONLY)
  async updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto): Promise<{ data: unknown }> {
    return { data: await this.svc.updateStage(id, dto) };
  }

  @Delete('pipeline/stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...ADMIN_ONLY)
  async deleteStage(@Param('id') id: string): Promise<void> {
    await this.svc.deleteStage(id);
  }
}
