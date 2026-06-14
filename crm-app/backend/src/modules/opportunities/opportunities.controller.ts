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
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  VisibilityGuard,
  RequestWithVisibility,
} from '../../common/guards/visibility.guard';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { CloseOpportunityDto } from './dto/close-opportunity.dto';
import { OpportunityFilterDto } from './dto/opportunity-filter.dto';

@Controller('opportunities')
@UseGuards(VisibilityGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  findAll(
    @Query() filter: OpportunityFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.opportunitiesService.findAll(filter, req.visibilityFilter);
  }

  @Post()
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  create(
    @Body() dto: CreateOpportunityDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.opportunitiesService.create(dto, req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    return this.opportunitiesService.findOne(id, req.visibilityFilter);
  }

  @Patch(':id')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.opportunitiesService.update(
      id,
      dto,
      req.user.sub,
      req.user.role,
      req.visibilityFilter,
    );
  }

  @Patch(':id/stage')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  moveStage(
    @Param('id') id: string,
    @Body() dto: MoveStageDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.opportunitiesService.moveStage(
      id,
      dto,
      req.user.sub,
      req.user.role,
      req.visibilityFilter,
    );
  }

  @Post(':id/close/won')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  closeWon(
    @Param('id') id: string,
    @Body() dto: CloseOpportunityDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.opportunitiesService.closeWon(
      id,
      dto,
      req.user.sub,
      req.user.role,
      req.visibilityFilter,
    );
  }

  @Post(':id/close/lost')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  closeLost(
    @Param('id') id: string,
    @Body() dto: CloseOpportunityDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.opportunitiesService.closeLost(
      id,
      dto,
      req.user.sub,
      req.user.role,
      req.visibilityFilter,
    );
  }
}
