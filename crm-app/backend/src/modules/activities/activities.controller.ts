import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityFilterDto } from './dto/activity-filter.dto';

@Controller('activities')
@UseGuards(VisibilityGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  findAll(
    @Query() filter: ActivityFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.activitiesService.findAll(filter, req.visibilityFilter);
  }

  @Post()
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  create(
    @Body() dto: CreateActivityDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.activitiesService.create(
      dto,
      req.user.sub,
      req.visibilityFilter,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    return this.activitiesService.findOne(id, req.visibilityFilter);
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
    @Body() dto: UpdateActivityDto,
    @Request() req: RequestWithVisibility,
  ) {
    const role = req.user.role as RoleName;
    const isAdmin =
      role === RoleName.SYSTEM_ADMINISTRATOR || role === RoleName.SALES_MANAGER;
    return this.activitiesService.update(
      id,
      dto,
      req.user.sub,
      isAdmin,
      req.visibilityFilter,
    );
  }

  @Delete(':id')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    const isAdmin = req.user.role === RoleName.SYSTEM_ADMINISTRATOR;
    return this.activitiesService.remove(
      id,
      req.user.sub,
      isAdmin,
      req.visibilityFilter,
    );
  }
}
