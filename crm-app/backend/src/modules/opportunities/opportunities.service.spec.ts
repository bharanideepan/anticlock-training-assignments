import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const baseOpp = {
  id: 'opp-1',
  name: 'Big Deal',
  ownerId: 'user-2',
  stage: {
    id: 'stage-1',
    name: 'Lead',
    isTerminal: false,
    terminalOutcome: null,
  },
  createdById: 'user-1',
  deletedAt: null,
};

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      opportunity: {
        create: jest.fn().mockResolvedValue(baseOpp),
        findFirst: jest.fn().mockResolvedValue(baseOpp),
        update: jest.fn().mockResolvedValue(baseOpp),
        findMany: jest.fn().mockResolvedValue([baseOpp]),
        count: jest.fn().mockResolvedValue(1),
      },
      pipelineStage: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stage-2',
          name: 'Qualified',
          isTerminal: false,
        }),
      },
    };
    notifications = { createAndSend: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(OpportunitiesService);
  });

  describe('OPPORTUNITY_ASSIGNED notification', () => {
    it('emits OPPORTUNITY_ASSIGNED when owner differs from creator', async () => {
      const dto = {
        name: 'Deal',
        customerId: 'cust-1',
        stageId: 'stage-1',
        ownerId: 'user-2',
      } as any;
      const actor = { id: 'user-1', role: 'SALES_MANAGER' } as any;
      prisma.opportunity.create.mockResolvedValue({
        ...baseOpp,
        ownerId: 'user-2',
      });
      await service.create(dto, actor.id);
      expect(notifications.createAndSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'OPPORTUNITY_ASSIGNED',
          recipientId: 'user-2',
        }),
      );
    });

    it('does not emit when owner is the creator', async () => {
      const dto = {
        name: 'Deal',
        customerId: 'cust-1',
        stageId: 'stage-1',
        ownerId: 'user-1',
      } as any;
      const actor = { id: 'user-1', role: 'SALES_MANAGER' } as any;
      prisma.opportunity.create.mockResolvedValue({
        ...baseOpp,
        ownerId: 'user-1',
      });
      await service.create(dto, actor.id);
      expect(notifications.createAndSend).not.toHaveBeenCalled();
    });
  });

  describe('terminal state enforcement', () => {
    it('throws ConflictException when moving from a terminal stage', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        ...baseOpp,
        stage: { id: 'won-stage', isTerminal: true, terminalOutcome: 'WON' },
      });
      const actor = { id: 'user-1', role: 'SALES_MANAGER' } as any;
      await expect(
        service.moveStage(
          'opp-1',
          { stageId: 'stage-2' } as any,
          actor.id,
          actor.role,
          {} as any,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
