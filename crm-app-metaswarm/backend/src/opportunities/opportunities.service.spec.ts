import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleName, TerminalOutcome } from '@prisma/client';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  opportunity: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  pipelineStage: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), updateMany: jest.fn() },
  customer: { findFirst: jest.fn() },
  contact: { findFirst: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(),
};

const ADMIN = RoleName.SYSTEM_ADMINISTRATOR;
const MANAGER = RoleName.SALES_MANAGER;
const REP = RoleName.SALES_REPRESENTATIVE;

const mockLeadStage = { id: 'stage-lead', name: 'Lead', displayOrder: 1, isDefault: true, isTerminal: false, terminalOutcome: null };
const mockWonStage = { id: 'stage-won', name: 'Won', displayOrder: 5, isDefault: false, isTerminal: true, terminalOutcome: TerminalOutcome.WON };
const mockLostStage = { id: 'stage-lost', name: 'Lost', displayOrder: 6, isDefault: false, isTerminal: true, terminalOutcome: TerminalOutcome.LOST };
const mockCustomer = { id: 'cust-1', companyName: 'Acme', ownerId: 'user-1' };
const mockContact = { id: 'cont-1', customerId: 'cust-1' };

const mockOpportunity = {
  id: 'opp-1', name: 'Deal A', customerId: 'cust-1', ownerId: 'user-1', stageId: 'stage-lead',
  expectedRevenue: null, probability: null, expectedCloseDate: null, actualCloseDate: null, closeNote: null,
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  stage: mockLeadStage,
  customer: { id: 'cust-1', companyName: 'Acme' },
  contact: null,
  owner: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
  _count: { tasks: 0 },
};

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpportunitiesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<OpportunitiesService>(OpportunitiesService);
  });

  describe('findAll', () => {
    it('returns paginated opportunities for admin', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([mockOpportunity]);
      mockPrisma.opportunity.count.mockResolvedValue(1);
      const result = await service.findAll({}, 'user-1', ADMIN, []);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('scopes to owned opportunities for SALES_REPRESENTATIVE', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.count.mockResolvedValue(0);
      await service.findAll({}, 'user-1', REP, []);
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ ownerId: 'user-1' }) }),
      );
    });

    it('excludes terminal stages by default', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.count.mockResolvedValue(0);
      await service.findAll({}, 'user-1', ADMIN, []);
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ stage: { isTerminal: false } }),
        }),
      );
    });

    it('includes terminal when includeTerminal=true', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.count.mockResolvedValue(0);
      await service.findAll({ includeTerminal: true }, 'user-1', ADMIN, []);
      const call = mockPrisma.opportunity.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where).not.toHaveProperty('stage');
    });
  });

  describe('findOne', () => {
    it('returns opportunity for admin', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      const result = await service.findOne('opp-1', 'user-1', ADMIN, []);
      expect(result.id).toBe('opp-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad', 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when REP accesses non-owned opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ ...mockOpportunity, ownerId: 'other-user' });
      await expect(service.findOne('opp-1', 'user-1', REP, [])).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates opportunity at default stage', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockLeadStage);
      mockPrisma.opportunity.create.mockResolvedValue(mockOpportunity);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.create({ name: 'Deal A', customerId: 'cust-1' }, 'user-1', ADMIN, []);
      expect(result.name).toBe('Deal A');
    });

    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.create({ name: 'X', customerId: 'bad' }, 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when contact not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      await expect(service.create({ name: 'X', customerId: 'cust-1', contactId: 'bad-cont' }, 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when contact is not linked to customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.contact.findFirst.mockResolvedValue({ ...mockContact, customerId: 'other-cust' });
      await expect(service.create({ name: 'X', customerId: 'cust-1', contactId: 'cont-1' }, 'user-1', ADMIN, [])).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('allows owner to update', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunity.update.mockResolvedValue({ ...mockOpportunity, name: 'Updated' });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.update('opp-1', { name: 'Updated' }, 'user-1', REP, []);
      expect(result.name).toBe('Updated');
    });

    it('allows admin to update any opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ ...mockOpportunity, ownerId: 'other-user' });
      mockPrisma.opportunity.update.mockResolvedValue(mockOpportunity);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      await service.update('opp-1', { name: 'X' }, 'admin', ADMIN, []);
      expect(mockPrisma.opportunity.update).toHaveBeenCalled();
    });

    it('throws ForbiddenException when non-owner REP tries to update', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ ...mockOpportunity, ownerId: 'other-user' });
      await expect(service.update('opp-1', { name: 'X' }, 'user-1', REP, [])).rejects.toThrow(ForbiddenException);
    });
  });

  describe('moveStage', () => {
    it('moves opportunity to a non-terminal stage', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      const qualifiedStage = { ...mockLeadStage, id: 'stage-qualified', name: 'Qualified', isTerminal: false };
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(qualifiedStage);
      mockPrisma.opportunity.update.mockResolvedValue({ ...mockOpportunity, stageId: 'stage-qualified', stage: qualifiedStage });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.moveStage('opp-1', { stageId: 'stage-qualified' }, 'user-1', REP, []);
      expect(result.stageId).toBe('stage-qualified');
    });

    it('throws ConflictException when target stage is terminal', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockWonStage);
      await expect(service.moveStage('opp-1', { stageId: 'stage-won' }, 'user-1', REP, [])).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when stage not found', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(null);
      await expect(service.moveStage('opp-1', { stageId: 'bad' }, 'user-1', REP, [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('closeWon / closeLost', () => {
    it('closes opportunity as Won', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockWonStage);
      mockPrisma.opportunity.update.mockResolvedValue({ ...mockOpportunity, stage: mockWonStage, actualCloseDate: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.closeWon('opp-1', {}, 'user-1', ADMIN, []);
      expect(result.stage.terminalOutcome).toBe(TerminalOutcome.WON);
    });

    it('closes opportunity as Lost', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockLostStage);
      mockPrisma.opportunity.update.mockResolvedValue({ ...mockOpportunity, stage: mockLostStage, actualCloseDate: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.closeLost('opp-1', {}, 'user-1', ADMIN, []);
      expect(result.stage.terminalOutcome).toBe(TerminalOutcome.LOST);
    });
  });

  describe('getPipelineBoard', () => {
    it('returns stages with opportunity cards', async () => {
      mockPrisma.pipelineStage.findMany.mockResolvedValue([mockLeadStage]);
      mockPrisma.opportunity.findMany.mockResolvedValue([mockOpportunity]);
      const result = await service.getPipelineBoard({}, 'user-1', ADMIN, []);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].stage.name).toBe('Lead');
    });
  });

  describe('Pipeline stages CRUD', () => {
    it('createStage creates new stage', async () => {
      mockPrisma.pipelineStage.create.mockResolvedValue({ id: 'stage-new', name: 'Discovery', displayOrder: 2, isDefault: false, isTerminal: false });
      const result = await service.createStage({ name: 'Discovery', displayOrder: 2 });
      expect(result.name).toBe('Discovery');
    });

    it('updateStage throws ConflictException for terminal stage', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockWonStage);
      await expect(service.updateStage('stage-won', { name: 'Won Updated' })).rejects.toThrow(ConflictException);
    });

    it('deleteStage throws ConflictException when active opportunities exist', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockLeadStage);
      mockPrisma.opportunity.count.mockResolvedValue(3);
      await expect(service.deleteStage('stage-lead')).rejects.toThrow(ConflictException);
    });

    it('deleteStage deletes when no active opportunities', async () => {
      mockPrisma.pipelineStage.findFirst.mockResolvedValue(mockLeadStage);
      mockPrisma.opportunity.count.mockResolvedValue(0);
      mockPrisma.pipelineStage.delete.mockResolvedValue(undefined);
      await service.deleteStage('stage-lead');
      expect(mockPrisma.pipelineStage.delete).toHaveBeenCalled();
    });
  });
});
