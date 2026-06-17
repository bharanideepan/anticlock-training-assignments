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
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

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

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles(...ALL_ROLES)
  async findAll(@Query() query: QueryTasksDto, @CurrentUser() actor: ActorPayload) {
    return this.tasksService.findAll(query, actor.sub, actor.role, actor.teamIds);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(...WRITE_ROLES)
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const task = await this.tasksService.create(dto, actor.sub, actor.role, actor.teamIds);
    return { data: task };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const task = await this.tasksService.findOne(id, actor.sub, actor.role, actor.teamIds);
    return { data: task };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const task = await this.tasksService.update(id, dto, actor.sub, actor.role, actor.teamIds);
    return { data: task };
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(...WRITE_ROLES)
  async complete(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const task = await this.tasksService.complete(id, actor.sub, actor.role, actor.teamIds);
    return { data: task };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(...WRITE_ROLES)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const task = await this.tasksService.cancel(id, actor.sub, actor.role, actor.teamIds);
    return { data: task };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...WRITE_ROLES)
  async remove(@Param('id') id: string, @CurrentUser() actor: ActorPayload): Promise<void> {
    await this.tasksService.remove(id, actor.sub, actor.role, actor.teamIds);
  }
}
