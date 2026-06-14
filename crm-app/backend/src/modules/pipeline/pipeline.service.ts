import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { PipelineFilterDto } from './dto/pipeline-filter.dto';
import { VisibilityFilter } from '../../common/guards/visibility.guard';

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getBoard(filter: PipelineFilterDto, visibility: VisibilityFilter) {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { terminalOutcome: null },
      orderBy: { displayOrder: 'asc' },
    });

    const oppWhere: any = {
      actualCloseDate: null,
      stageId: { in: stages.map((s) => s.id) },
    };
    if (visibility.ownerId) oppWhere.ownerId = visibility.ownerId;
    else if (visibility.ownerIdIn)
      oppWhere.ownerId = { in: visibility.ownerIdIn };
    if (filter.ownerId) oppWhere.ownerId = filter.ownerId;
    if (filter.search)
      oppWhere.name = { contains: filter.search, mode: 'insensitive' };
    if (filter.closeDateFrom || filter.closeDateTo) {
      oppWhere.expectedCloseDate = {};
      if (filter.closeDateFrom)
        oppWhere.expectedCloseDate.gte = new Date(filter.closeDateFrom);
      if (filter.closeDateTo)
        oppWhere.expectedCloseDate.lte = new Date(filter.closeDateTo);
    }

    const opportunities = await this.prisma.opportunity.findMany({
      where: oppWhere,
      select: {
        id: true,
        name: true,
        expectedRevenue: true,
        expectedCloseDate: true,
        stageId: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return stages.map((stage) => {
      const stageOpps = opportunities.filter((o) => o.stageId === stage.id);
      const totalValue = stageOpps.reduce(
        (sum, o) => sum + Number(o.expectedRevenue ?? 0),
        0,
      );
      return {
        stage: {
          id: stage.id,
          name: stage.name,
          displayOrder: stage.displayOrder,
        },
        opportunities: stageOpps,
        totalValue: totalValue.toFixed(2),
        count: stageOpps.length,
      };
    });
  }

  async listStages() {
    return this.prisma.pipelineStage.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createStage(dto: CreateStageDto) {
    const maxOrder = await this.prisma.pipelineStage.aggregate({
      _max: { displayOrder: true },
    });
    const displayOrder =
      dto.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1;

    return this.prisma.pipelineStage.create({
      data: { name: dto.name, displayOrder },
    });
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    const stage = await this.prisma.pipelineStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('STAGE_NOT_FOUND');
    if (stage.terminalOutcome)
      throw new ConflictException('CANNOT_MODIFY_TERMINAL_STAGE');

    return this.prisma.pipelineStage.update({ where: { id }, data: dto });
  }

  async deleteStage(id: string) {
    const stage = await this.prisma.pipelineStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('STAGE_NOT_FOUND');

    const activeCount = await this.prisma.opportunity.count({
      where: { stageId: id, actualCloseDate: null },
    });
    if (activeCount > 0)
      throw new ConflictException('STAGE_HAS_ACTIVE_OPPORTUNITIES');

    await this.prisma.pipelineStage.delete({ where: { id } });
  }

  async reorderStages(dto: ReorderStagesDto) {
    await Promise.all(
      dto.stageIds.map((stageId, index) =>
        this.prisma.pipelineStage.update({
          where: { id: stageId },
          data: { displayOrder: index + 1 },
        }),
      ),
    );
    return this.listStages();
  }
}
