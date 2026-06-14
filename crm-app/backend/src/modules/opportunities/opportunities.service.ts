import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { TerminalOutcome } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { CloseOpportunityDto } from './dto/close-opportunity.dto';
import { OpportunityFilterDto } from './dto/opportunity-filter.dto';
import { VisibilityFilter } from '../../common/guards/visibility.guard';
import { paginate } from '../../common/pagination/paginated-result';

const OPP_SELECT = {
  id: true,
  name: true,
  expectedRevenue: true,
  probability: true,
  expectedCloseDate: true,
  actualCloseDate: true,
  closeNote: true,
  createdAt: true,
  updatedAt: true,
  stage: {
    select: { id: true, name: true, displayOrder: true, terminalOutcome: true },
  },
  customer: { select: { id: true, companyName: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  private buildVisibilityWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId) return { ownerId: visibility.ownerId };
    if (visibility.ownerIdIn) return { ownerId: { in: visibility.ownerIdIn } };
    return {};
  }

  private checkOwnership(opp: any, actorId: string, role: string) {
    const isPrivileged = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER'].includes(
      role,
    );
    if (!isPrivileged && opp.owner?.id !== actorId) {
      throw new ForbiddenException('ACCESS_DENIED');
    }
  }

  async findAll(filter: OpportunityFilterDto, visibility: VisibilityFilter) {
    const where: any = { ...this.buildVisibilityWhere(visibility) };

    if (!filter.includeTerminal) where.actualCloseDate = null;
    if (filter.search)
      where.name = { contains: filter.search, mode: 'insensitive' };
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.ownerId) where.ownerId = filter.ownerId;
    if (filter.stageId) where.stageId = filter.stageId;
    if (filter.minRevenue != null || filter.maxRevenue != null) {
      where.expectedRevenue = {};
      if (filter.minRevenue != null)
        where.expectedRevenue.gte = filter.minRevenue;
      if (filter.maxRevenue != null)
        where.expectedRevenue.lte = filter.maxRevenue;
    }
    if (filter.closeDateFrom || filter.closeDateTo) {
      where.expectedCloseDate = {};
      if (filter.closeDateFrom)
        where.expectedCloseDate.gte = new Date(filter.closeDateFrom);
      if (filter.closeDateTo)
        where.expectedCloseDate.lte = new Date(filter.closeDateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        select: OPP_SELECT,
        orderBy: { [filter.sortBy ?? 'updatedAt']: filter.sortOrder },
        skip: filter.skip,
        take: filter.pageSize,
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    return paginate(data, total, filter.page, filter.pageSize);
  }

  async findOne(id: string, visibility: VisibilityFilter) {
    const where: any = { id, ...this.buildVisibilityWhere(visibility) };
    const opp = await this.prisma.opportunity.findFirst({
      where,
      select: {
        ...OPP_SELECT,
        _count: { select: { tasks: true } },
      },
    });
    if (!opp) throw new NotFoundException('OPPORTUNITY_NOT_FOUND');

    const fileCount = await this.prisma.file.count({
      where: { resourceType: 'OPPORTUNITY', resourceId: id },
    });
    return {
      ...opp,
      _counts: { tasks: opp._count.tasks, files: fileCount },
      _count: undefined,
    };
  }

  async create(dto: CreateOpportunityDto, actorId: string) {
    const defaultStage = await this.prisma.pipelineStage.findFirst({
      where: { isDefault: true },
      orderBy: { displayOrder: 'asc' },
    });
    if (!defaultStage) throw new NotFoundException('NO_DEFAULT_STAGE');

    const ownerId = dto.ownerId ?? actorId;
    const opp = await this.prisma.opportunity.create({
      data: {
        name: dto.name,
        customerId: dto.customerId,
        contactId: dto.contactId,
        ownerId,
        stageId: defaultStage.id,
        expectedRevenue: dto.expectedRevenue,
        probability: dto.probability,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : undefined,
      },
      select: OPP_SELECT,
    });

    if (ownerId !== actorId) {
      await this.notificationsService.createAndSend({
        userId: ownerId,
        type: 'OPPORTUNITY_ASSIGNED',
        title: 'Opportunity assigned to you',
        body: `You have been assigned the opportunity "${opp.name}".`,
        resourceType: 'OPPORTUNITY',
        resourceId: opp.id,
      });
    }

    return opp;
  }

  async update(
    id: string,
    dto: UpdateOpportunityDto,
    actorId: string,
    role: string,
    visibility: VisibilityFilter,
  ) {
    const opp = await this.findOne(id, visibility);
    this.checkOwnership(opp, actorId, role);

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        ...dto,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : undefined,
      },
      select: OPP_SELECT,
    });
  }

  async moveStage(
    id: string,
    dto: MoveStageDto,
    actorId: string,
    role: string,
    visibility: VisibilityFilter,
  ) {
    const opp = await this.findOne(id, visibility);
    this.checkOwnership(opp, actorId, role);

    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id: dto.stageId },
    });
    if (!stage) throw new NotFoundException('STAGE_NOT_FOUND');
    if (stage.terminalOutcome) throw new ConflictException('STAGE_IS_TERMINAL');

    return this.prisma.opportunity.update({
      where: { id },
      data: { stageId: dto.stageId },
      select: OPP_SELECT,
    });
  }

  async closeWon(
    id: string,
    dto: CloseOpportunityDto,
    actorId: string,
    role: string,
    visibility: VisibilityFilter,
  ) {
    const opp = await this.findOne(id, visibility);
    this.checkOwnership(opp, actorId, role);

    const wonStage = await this.prisma.pipelineStage.findFirst({
      where: { terminalOutcome: TerminalOutcome.WON },
    });
    if (!wonStage) throw new NotFoundException('WON_STAGE_NOT_FOUND');

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        stageId: wonStage.id,
        actualCloseDate: new Date(),
        closeNote: dto.closeNote,
      },
      select: OPP_SELECT,
    });
  }

  async closeLost(
    id: string,
    dto: CloseOpportunityDto,
    actorId: string,
    role: string,
    visibility: VisibilityFilter,
  ) {
    const opp = await this.findOne(id, visibility);
    this.checkOwnership(opp, actorId, role);

    const lostStage = await this.prisma.pipelineStage.findFirst({
      where: { terminalOutcome: TerminalOutcome.LOST },
    });
    if (!lostStage) throw new NotFoundException('LOST_STAGE_NOT_FOUND');

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        stageId: lostStage.id,
        actualCloseDate: new Date(),
        closeNote: dto.closeNote,
      },
      select: OPP_SELECT,
    });
  }
}
