import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  VisibilityGuard,
  RequestWithVisibility,
} from '../../common/guards/visibility.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';

@Controller('tasks')
@UseGuards(VisibilityGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @Query() filter: TaskFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.tasksService.findAll(filter, req.visibilityFilter);
  }

  @Post()
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  create(@Body() dto: CreateTaskDto, @Request() req: RequestWithVisibility) {
    return this.tasksService.create(dto, req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    return this.tasksService.findOne(id, req.visibilityFilter);
  }

  @Patch(':id')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: RequestWithVisibility,
  ) {
    const isAdmin =
      (req.user.role as RoleName) === RoleName.SYSTEM_ADMINISTRATOR ||
      (req.user.role as RoleName) === RoleName.SALES_MANAGER;
    return this.tasksService.update(id, dto, req.user.sub, isAdmin);
  }

  @Post(':id/complete')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  @HttpCode(HttpStatus.OK)
  complete(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    const isAdmin =
      (req.user.role as RoleName) === RoleName.SYSTEM_ADMINISTRATOR ||
      (req.user.role as RoleName) === RoleName.SALES_MANAGER;
    return this.tasksService.complete(id, req.user.sub, isAdmin);
  }

  @Post(':id/cancel')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    const isAdmin =
      (req.user.role as RoleName) === RoleName.SYSTEM_ADMINISTRATOR ||
      (req.user.role as RoleName) === RoleName.SALES_MANAGER;
    return this.tasksService.cancel(id, req.user.sub, isAdmin);
  }
}
