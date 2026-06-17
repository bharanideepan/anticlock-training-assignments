import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityType, RoleName } from '@prisma/client';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  activity: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  customer: { findFirst: jest.fn() },
  contact: { findFirst: jest.fn() },
  auditLog: { create: jest.fn() },
};

const ADMIN = RoleName.SYSTEM_ADMINISTRATOR;
const MANAGER = RoleName.SALES_MANAGER;
const REP = RoleName.SALES_REPRESENTATIVE;

const mockCustomer = { id: 'cust-1', companyName: 'Acme', ownerId: 'user-1' };
const mockContact = { id: 'cont-1', firstName: 'Sarah', lastName: 'Lee', customerId: 'cust-1' };

const mockActivity = {
  id: 'act-1', type: ActivityType.PHONE_CALL, subject: 'Call', description: 'Initial call',
  scheduledAt: null, durationMinutes: null, customerId: 'cust-1', contactId: null, createdById: 'user-1',
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  customer: { id: 'cust-1', companyName: 'Acme', ownerId: 'user-1' },
  contact: null,
  createdBy: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
};

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivitiesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ActivitiesService>(ActivitiesService);
  });

  describe('findAll', () => {
    it('returns paginated activities for admin', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([mockActivity]);
      mockPrisma.activity.count.mockResolvedValue(1);
      const result = await service.findAll({}, 'user-1', ADMIN, []);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('scopes to own activities for SALES_REPRESENTATIVE', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);
      await service.findAll({}, 'user-1', REP, []);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ createdById: 'user-1' }) }),
      );
    });

    it('filters by type', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);
      await service.findAll({ type: ActivityType.MEETING }, 'user-1', ADMIN, []);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: ActivityType.MEETING }) }),
      );
    });
  });

  describe('findOne', () => {
    it('returns activity for admin', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivity);
      const result = await service.findOne('act-1', 'user-1', ADMIN, []);
      expect(result.id).toBe('act-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad', 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates activity for valid customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.activity.create.mockResolvedValue(mockActivity);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.create(
        { type: ActivityType.PHONE_CALL, subject: 'Call', customerId: 'cust-1' },
        'user-1', ADMIN, [],
      );
      expect(result.type).toBe(ActivityType.PHONE_CALL);
    });

    it('throws NotFoundException when customer does not exist', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ type: ActivityType.PHONE_CALL, subject: 'Call', customerId: 'bad' }, 'user-1', ADMIN, []),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when contact is not linked to customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.contact.findFirst.mockResolvedValue({ ...mockContact, customerId: 'other-cust' });
      await expect(
        service.create({ type: ActivityType.PHONE_CALL, subject: 'Call', customerId: 'cust-1', contactId: 'cont-1' }, 'user-1', ADMIN, []),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when contactId provided but contact not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ type: ActivityType.PHONE_CALL, subject: 'Call', customerId: 'cust-1', contactId: 'bad-cont' }, 'user-1', ADMIN, []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('allows owner to update their activity', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivity);
      mockPrisma.activity.update.mockResolvedValue({ ...mockActivity, subject: 'Updated call' });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.update('act-1', { subject: 'Updated call' }, 'user-1', REP, []);
      expect(result.subject).toBe('Updated call');
    });

    it('allows admin to update any activity', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({ ...mockActivity, createdById: 'other-user' });
      mockPrisma.activity.update.mockResolvedValue({ ...mockActivity, subject: 'Admin updated' });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.update('act-1', { subject: 'Admin updated' }, 'admin-1', ADMIN, []);
      expect(result.subject).toBe('Admin updated');
    });

    it('throws ForbiddenException when non-owner REP tries to update', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({ ...mockActivity, createdById: 'other-user' });
      await expect(service.update('act-1', { subject: 'X' }, 'user-1', REP, [])).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when activity not found', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);
      await expect(service.update('bad', { subject: 'X' }, 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes activity as owner', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivity);
      mockPrisma.activity.update.mockResolvedValue({ ...mockActivity, deletedAt: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      await service.remove('act-1', 'user-1', REP, []);
      expect(mockPrisma.activity.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('throws ForbiddenException when non-owner MANAGER tries to delete', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({ ...mockActivity, createdById: 'other-user' });
      await expect(service.remove('act-1', 'mgr-1', MANAGER, [])).rejects.toThrow(ForbiddenException);
    });
  });
});
