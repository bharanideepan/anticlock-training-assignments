import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoleName, TerminalOutcome } from '@prisma/client';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockService = {
  findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn(),
  moveStage: jest.fn(), closeWon: jest.fn(), closeLost: jest.fn(),
  getPipelineBoard: jest.fn(), getStages: jest.fn(), createStage: jest.fn(),
  updateStage: jest.fn(), deleteStage: jest.fn(), reorderStages: jest.fn(),
};

const adminActor = { sub: 'admin-id', email: 'a@b.com', role: RoleName.SYSTEM_ADMINISTRATOR, teamIds: [] as string[] };

const mockOpp = {
  id: 'opp-1', name: 'Deal A', stageId: 'stage-lead',
  stage: { id: 'stage-lead', name: 'Lead', displayOrder: 1, isTerminal: false, terminalOutcome: null },
  customer: { id: 'cust-1', companyName: 'Acme' }, contact: null,
  owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' }, _count: { tasks: 0 },
};

const mockStage = { id: 'stage-lead', name: 'Lead', displayOrder: 1, isDefault: true, isTerminal: false, terminalOutcome: null };

describe('OpportunitiesController', () => {
  let controller: OpportunitiesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpportunitiesController],
      providers: [{ provide: OpportunitiesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<OpportunitiesController>(OpportunitiesController);
  });

  it('GET /opportunities — returns paginated list', async () => {
    mockService.findAll.mockResolvedValue({ data: [mockOpp], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } });
    const result = await controller.findAll({}, adminActor as never);
    expect(result.data).toHaveLength(1);
  });

  it('POST /opportunities — returns 201', async () => {
    mockService.create.mockResolvedValue(mockOpp);
    const result = await controller.create({ name: 'Deal A', customerId: 'cust-1' }, adminActor as never);
    expect(result).toEqual({ data: mockOpp });
  });

  it('GET /opportunities/:id — returns { data }', async () => {
    mockService.findOne.mockResolvedValue(mockOpp);
    const result = await controller.findOne('opp-1', adminActor as never);
    expect(result).toEqual({ data: mockOpp });
  });

  it('GET /opportunities/:id — propagates NotFoundException', async () => {
    mockService.findOne.mockRejectedValue(new NotFoundException());
    await expect(controller.findOne('bad', adminActor as never)).rejects.toThrow(NotFoundException);
  });

  it('PATCH /opportunities/:id — returns updated', async () => {
    const updated = { ...mockOpp, name: 'Updated' };
    mockService.update.mockResolvedValue(updated);
    const result = await controller.update('opp-1', { name: 'Updated' }, adminActor as never);
    expect(result).toEqual({ data: updated });
  });

  it('PATCH /opportunities/:id/stage — moves stage', async () => {
    mockService.moveStage.mockResolvedValue(mockOpp);
    const result = await controller.moveStage('opp-1', { stageId: 'stage-qualified' }, adminActor as never);
    expect(result).toEqual({ data: mockOpp });
  });

  it('POST /opportunities/:id/close/won — closes as Won', async () => {
    const wonOpp = { ...mockOpp, stage: { ...mockOpp.stage, terminalOutcome: TerminalOutcome.WON } };
    mockService.closeWon.mockResolvedValue(wonOpp);
    const result = await controller.closeWon('opp-1', {}, adminActor as never);
    expect((result.data as typeof wonOpp).stage.terminalOutcome).toBe(TerminalOutcome.WON);
  });

  it('POST /opportunities/:id/close/lost — closes as Lost', async () => {
    const lostOpp = { ...mockOpp, stage: { ...mockOpp.stage, terminalOutcome: TerminalOutcome.LOST } };
    mockService.closeLost.mockResolvedValue(lostOpp);
    const result = await controller.closeLost('opp-1', {}, adminActor as never);
    expect((result.data as typeof lostOpp).stage.terminalOutcome).toBe(TerminalOutcome.LOST);
  });

  it('GET /pipeline — returns board', async () => {
    mockService.getPipelineBoard.mockResolvedValue({ data: [{ stage: mockStage, opportunities: [], totalValue: '0.00', count: 0 }] });
    const result = await controller.getBoard({}, adminActor as never);
    expect(result.data).toHaveLength(1);
  });

  it('GET /pipeline/stages — returns stages', async () => {
    mockService.getStages.mockResolvedValue([mockStage]);
    const result = await controller.getStages();
    expect(result).toEqual({ data: [mockStage] });
  });

  it('POST /pipeline/stages — creates stage', async () => {
    mockService.createStage.mockResolvedValue(mockStage);
    const result = await controller.createStage({ name: 'Discovery' });
    expect(result).toEqual({ data: mockStage });
  });

  it('DELETE /pipeline/stages/:id — calls deleteStage', async () => {
    mockService.deleteStage.mockResolvedValue(undefined);
    await controller.deleteStage('stage-lead');
    expect(mockService.deleteStage).toHaveBeenCalledWith('stage-lead');
  });
});
