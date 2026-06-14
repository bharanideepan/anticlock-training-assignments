import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const baseCustomer = {
  id: 'cust-1',
  companyName: 'Acme',
  status: 'PROSPECT',
  ownerId: 'user-1',
  deletedAt: null,
};

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      customer: {
        create: jest.fn().mockResolvedValue(baseCustomer),
        findFirst: jest.fn().mockResolvedValue(baseCustomer),
        update: jest.fn().mockResolvedValue(baseCustomer),
        findMany: jest.fn().mockResolvedValue([baseCustomer]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    notifications = { createAndSend: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(CustomersService);
  });

  describe('status transitions', () => {
    it('allows PROSPECT -> ACTIVE transition', async () => {
      prisma.customer.update.mockResolvedValue({
        ...baseCustomer,
        status: 'ACTIVE',
      });
      await service.transition(
        'cust-1',
        { status: 'ACTIVE' } as any,
        {},
        false,
      );
      expect(prisma.customer.update).toHaveBeenCalled();
    });

    it('throws ConflictException for invalid transition (PROSPECT -> ARCHIVED)', async () => {
      await expect(
        service.transition(
          'cust-1',
          { status: 'ARCHIVED' } as any,
          {} as any,
          false,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when non-admin tries to archive', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        ...baseCustomer,
        status: 'INACTIVE',
      });
      const actor = { id: 'user-2', role: 'SALES_REPRESENTATIVE' } as any;
      await expect(service.archive('cust-1', actor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
