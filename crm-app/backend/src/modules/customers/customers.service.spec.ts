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
  owner: null,
  deletedAt: null,
};

const baseCustomerWithCount = {
  ...baseCustomer,
  _count: { contacts: 0, activities: 0, tasks: 0 },
};

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      customer: {
        create: jest.fn().mockResolvedValue(baseCustomer),
        findFirst: jest.fn().mockResolvedValue(baseCustomerWithCount),
        update: jest.fn().mockResolvedValue(baseCustomer),
        findMany: jest.fn().mockResolvedValue([baseCustomer]),
        count: jest.fn().mockResolvedValue(1),
      },
      opportunity: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      file: {
        count: jest.fn().mockResolvedValue(0),
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

    it('throws ForbiddenException when non-admin calls transition on archived customer', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        ...baseCustomerWithCount,
        status: 'ARCHIVED',
      });
      await expect(
        service.transition('cust-1', { status: 'INACTIVE' } as any, {}, false),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
