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
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';

interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

const ALL_ROLES = [
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
  RoleName.SUPPORT_REPRESENTATIVE,
  RoleName.READ_ONLY,
];

const WRITE_ROLES = [
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
  RoleName.SUPPORT_REPRESENTATIVE,
];

@ApiTags('activities')
@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Roles(...ALL_ROLES)
  async findAll(@Query() query: QueryActivitiesDto, @CurrentUser() actor: ActorPayload) {
    return this.activitiesService.findAll(query, actor.sub, actor.role, actor.teamIds);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(...WRITE_ROLES)
  async create(
    @Body() dto: CreateActivityDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const activity = await this.activitiesService.create(dto, actor.sub, actor.role, actor.teamIds);
    return { data: activity };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const activity = await this.activitiesService.findOne(id, actor.sub, actor.role, actor.teamIds);
    return { data: activity };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const activity = await this.activitiesService.update(id, dto, actor.sub, actor.role, actor.teamIds);
    return { data: activity };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...WRITE_ROLES)
  async remove(@Param('id') id: string, @CurrentUser() actor: ActorPayload): Promise<void> {
    await this.activitiesService.remove(id, actor.sub, actor.role, actor.teamIds);
  }
}
