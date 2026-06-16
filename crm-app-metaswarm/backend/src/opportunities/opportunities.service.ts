import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, RoleName, TerminalOutcome } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { CloseOpportunityDto } from './dto/close-opportunity.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

const OPPORTUNITY_INCLUDE = {
  stage: { select: { id: true, name: true, displayOrder: true, isTerminal: true, terminalOutcome: true } },
  customer: { select: { id: true, companyName: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { tasks: true } },
} as const;

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryOpportunitiesDto,
    actorId: string,
    actorRole: RoleName,
    _actorTeamIds: string[],
  ) {
    const {
      page = 1, pageSize = 20, search, customerId, ownerId, stageId,
      minRevenue, maxRevenue, closeDateFrom, closeDateTo, includeTerminal,
      sortBy, sortOrder = 'desc',
    } = query;

    const where: Record<string, unknown> = {};

    if (actorRole === RoleName.SALES_REPRESENTATIVE) where['ownerId'] = actorId;

    if (!includeTerminal) where['stage'] = { isTerminal: false };
    if (search) where['name'] = { contains: search, mode: 'insensitive' };
    if (customerId) where['customerId'] = customerId;
    if (ownerId) where['ownerId'] = ownerId;
    if (stageId) where['stageId'] = stageId;
    if (minRevenue !== undefined || maxRevenue !== undefined) {
      const rev: Record<string, number> = {};
      if (minRevenue !== undefined) rev['gte'] = minRevenue;
      if (maxRevenue !== undefined) rev['lte'] = maxRevenue;
      where['expectedRevenue'] = rev;
    }
    if (closeDateFrom || closeDateTo) {
      const cd: Record<string, Date> = {};
      if (closeDateFrom) cd['gte'] = new Date(closeDateFrom);
      if (closeDateTo) cd['lte'] = new Date(closeDateTo);
      where['expectedCloseDate'] = cd;
    }

    const orderBy = { [sortBy ?? 'createdAt']: sortOrder };
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [opportunities, total] = await Promise.all([
      this.prisma.opportunity.findMany({ where, include: OPPORTUNITY_INCLUDE, orderBy, skip, take }),
      this.prisma.opportunity.count({ where }),
    ]);

    return { data: opportunities, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, actorId: string, actorRole: RoleName, actorTeamIds: string[]) {
    void actorTeamIds;
    const opp = await this.prisma.opportunity.findFirst({ where: { id }, include: OPPORTUNITY_INCLUDE });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' });
    this.assertAccess(opp, actorId, actorRole);
    return opp;
  }

  async create(
    dto: CreateOpportunityDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    void actorRole; void actorTeamIds;

    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });

    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({ where: { id: dto.contactId } });
      if (!contact) throw new NotFoundException({ code: 'CONTACT_NOT_FOUND', message: 'Contact not found' });
      if (contact.customerId !== dto.customerId) {
        throw new ConflictException({ code: 'CONTACT_NOT_LINKED_TO_CUSTOMER', message: 'Contact does not belong to the specified customer' });
      }
    }

    const defaultStage = await this.prisma.pipelineStage.findFirst({ where: { isDefault: true } });
    if (!defaultStage) throw new NotFoundException({ code: 'DEFAULT_STAGE_NOT_FOUND', message: 'Default pipeline stage not found' });

    const { customerId, contactId, ownerId, ...rest } = dto;

    const opp = await this.prisma.opportunity.create({
      data: {
        ...rest,
        customerId,
        contactId: contactId ?? null,
        ownerId: ownerId ?? actorId,
        stageId: defaultStage.id,
      },
      include: OPPORTUNITY_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_CREATED, resourceType: 'Opportunity', resourceId: opp.id },
    });

    return opp;
  }

  async update(
    id: string,
    dto: UpdateOpportunityDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const opp = await this.findOne(id, actorId, actorRole, actorTeamIds);
    this.assertWriteAccess(opp, actorId, actorRole);

    const updated = await this.prisma.opportunity.update({
      where: { id: opp.id },
      data: dto,
      include: OPPORTUNITY_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_UPDATED, resourceType: 'Opportunity', resourceId: id },
    });

    return updated;
  }

  async moveStage(
    id: string,
    dto: MoveStageDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const opp = await this.findOne(id, actorId, actorRole, actorTeamIds);
    this.assertWriteAccess(opp, actorId, actorRole);

    const stage = await this.prisma.pipelineStage.findFirst({ where: { id: dto.stageId } });
    if (!stage) throw new NotFoundException({ code: 'STAGE_NOT_FOUND', message: 'Pipeline stage not found' });
    if (stage.isTerminal) {
      throw new ConflictException({ code: 'STAGE_IS_TERMINAL', message: 'Use /close/won or /close/lost to move to a terminal stage' });
    }

    const updated = await this.prisma.opportunity.update({
      where: { id: opp.id },
      data: { stageId: dto.stageId },
      include: OPPORTUNITY_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_UPDATED, resourceType: 'Opportunity', resourceId: id },
    });

    return updated;
  }

  async closeWon(
    id: string,
    dto: CloseOpportunityDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    return this.closeOpportunity(id, TerminalOutcome.WON, dto.closeNote, actorId, actorRole, actorTeamIds);
  }

  async closeLost(
    id: string,
    dto: CloseOpportunityDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    return this.closeOpportunity(id, TerminalOutcome.LOST, dto.closeNote, actorId, actorRole, actorTeamIds);
  }

  private async closeOpportunity(
    id: string,
    outcome: TerminalOutcome,
    closeNote: string | undefined,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const opp = await this.findOne(id, actorId, actorRole, actorTeamIds);
    this.assertWriteAccess(opp, actorId, actorRole);

    const terminalStage = await this.prisma.pipelineStage.findFirst({ where: { terminalOutcome: outcome } });
    if (!terminalStage) throw new NotFoundException({ code: 'TERMINAL_STAGE_NOT_FOUND', message: 'Terminal stage not configured' });

    const updated = await this.prisma.opportunity.update({
      where: { id: opp.id },
      data: { stageId: terminalStage.id, actualCloseDate: new Date(), closeNote: closeNote ?? null },
      include: OPPORTUNITY_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_UPDATED, resourceType: 'Opportunity', resourceId: id },
    });

    return updated;
  }

  async getPipelineBoard(
    query: { ownerId?: string; search?: string; closeDateFrom?: string; closeDateTo?: string },
    actorId: string,
    actorRole: RoleName,
    _actorTeamIds: string[],
  ) {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { isTerminal: false },
      orderBy: { displayOrder: 'asc' },
    });

    const oppWhere: Record<string, unknown> = {
      stage: { isTerminal: false },
    };
    if (actorRole === RoleName.SALES_REPRESENTATIVE) oppWhere['ownerId'] = actorId;
    if (query.ownerId) oppWhere['ownerId'] = query.ownerId;
    if (query.search) oppWhere['name'] = { contains: query.search, mode: 'insensitive' };
    if (query.closeDateFrom || query.closeDateTo) {
      const cd: Record<string, Date> = {};
      if (query.closeDateFrom) cd['gte'] = new Date(query.closeDateFrom);
      if (query.closeDateTo) cd['lte'] = new Date(query.closeDateTo);
      oppWhere['expectedCloseDate'] = cd;
    }

    const allOpps = await this.prisma.opportunity.findMany({
      where: oppWhere,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const board = stages.map((stage) => {
      const opps = allOpps.filter((o) => o.stageId === stage.id);
      const totalValue = opps.reduce((sum, o) => sum + (o.expectedRevenue ? Number(o.expectedRevenue) : 0), 0);
      return {
        stage: { id: stage.id, name: stage.name, displayOrder: stage.displayOrder },
        opportunities: opps.map((o) => ({
          id: o.id, name: o.name,
          expectedRevenue: o.expectedRevenue,
          expectedCloseDate: o.expectedCloseDate,
          owner: o.owner,
        })),
        totalValue: totalValue.toFixed(2),
        count: opps.length,
      };
    });

    return { data: board };
  }

  async getStages() {
    return this.prisma.pipelineStage.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async createStage(dto: CreateStageDto) {
    const stage = await this.prisma.pipelineStage.create({
      data: {
        name: dto.name,
        displayOrder: dto.displayOrder ?? 999,
        isDefault: false,
        isTerminal: false,
      },
    });
    return stage;
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    const stage = await this.prisma.pipelineStage.findFirst({ where: { id } });
    if (!stage) throw new NotFoundException({ code: 'STAGE_NOT_FOUND', message: 'Pipeline stage not found' });
    if (stage.isTerminal) {
      throw new ConflictException({ code: 'CANNOT_MODIFY_TERMINAL_STAGE', message: 'Terminal stages cannot be modified' });
    }
    return this.prisma.pipelineStage.update({ where: { id }, data: dto });
  }

  async deleteStage(id: string) {
    const stage = await this.prisma.pipelineStage.findFirst({ where: { id } });
    if (!stage) throw new NotFoundException({ code: 'STAGE_NOT_FOUND', message: 'Pipeline stage not found' });

    const activeCount = await this.prisma.opportunity.count({ where: { stageId: id } });
    if (activeCount > 0) {
      throw new ConflictException({ code: 'STAGE_HAS_ACTIVE_OPPORTUNITIES', message: 'Cannot delete stage with active opportunities' });
    }

    await this.prisma.pipelineStage.delete({ where: { id } });
  }

  async reorderStages(dto: ReorderStagesDto) {
    await Promise.all(
      dto.stageIds.map((stageId, idx) =>
        this.prisma.pipelineStage.update({ where: { id: stageId }, data: { displayOrder: idx + 1 } }),
      ),
    );
    return this.getStages();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertAccess(opp: { ownerId: string }, actorId: string, actorRole: RoleName) {
    if (actorRole === RoleName.SYSTEM_ADMINISTRATOR || actorRole === RoleName.SALES_MANAGER) return;
    if (opp.ownerId !== actorId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }
  }

  private assertWriteAccess(opp: { ownerId: string }, actorId: string, actorRole: RoleName) {
    if (actorRole === RoleName.SYSTEM_ADMINISTRATOR || actorRole === RoleName.SALES_MANAGER) return;
    if (opp.ownerId !== actorId) {
      throw new ForbiddenException({ code: 'NOT_OPPORTUNITY_OWNER', message: 'Only the opportunity owner can modify it' });
    }
  }
}
