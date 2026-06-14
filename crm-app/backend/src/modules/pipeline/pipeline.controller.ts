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
import { PipelineService } from './pipeline.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { PipelineFilterDto } from './dto/pipeline-filter.dto';

@Controller('pipeline')
@UseGuards(VisibilityGuard)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get()
  getBoard(
    @Query() filter: PipelineFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.pipelineService.getBoard(filter, req.visibilityFilter);
  }

  @Get('stages')
  listStages() {
    return this.pipelineService.listStages();
  }

  @Post('stages')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  createStage(@Body() dto: CreateStageDto) {
    return this.pipelineService.createStage(dto);
  }

  @Patch('stages/reorder')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  reorderStages(@Body() dto: ReorderStagesDto) {
    return this.pipelineService.reorderStages(dto);
  }

  @Patch('stages/:id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.pipelineService.updateStage(id, dto);
  }

  @Delete('stages/:id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStage(@Param('id') id: string) {
    return this.pipelineService.deleteStage(id);
  }
}
