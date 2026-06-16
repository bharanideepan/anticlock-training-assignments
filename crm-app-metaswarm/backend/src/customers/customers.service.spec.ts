import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomerStatus, RoleName } from '@prisma/client';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  customer: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  opportunity: {
    updateMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
};

const ADMIN = RoleName.SYSTEM_ADMINISTRATOR;
const MANAGER = RoleName.SALES_MANAGER;
const REP = RoleName.SALES_REPRESENTATIVE;

const mockCustomer = {
  id: 'cust-1',
  companyName: 'Acme Corp',
  industry: 'Technology',
  website: 'https://acme.com',
  revenueRange: null,
  addressLine1: null,
  addressLine2: null,
  city: 'San Francisco',
  state: 'CA',
  country: 'US',
  postalCode: null,
  status: CustomerStatus.PROSPECT,
  ownerId: 'user-1',
  searchVector: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  owner: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
};

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('findAll', () => {
    it('returns paginated customers for admin', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([mockCustomer]);
      mockPrisma.customer.count.mockResolvedValue(1);

      const result = await service.findAll({}, 'user-1', ADMIN, []);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('scopes to owned customers for SALES_REPRESENTATIVE', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([mockCustomer]);
      mockPrisma.customer.count.mockResolvedValue(1);

      await service.findAll({}, 'user-1', REP, []);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'user-1' }),
        }),
      );
    });

    it('excludes ARCHIVED by default', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      await service.findAll({}, 'user-1', ADMIN, []);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { not: CustomerStatus.ARCHIVED } }),
        }),
      );
    });

    it('includes ARCHIVED when status=ARCHIVED filter is applied', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      await service.findAll({ status: CustomerStatus.ARCHIVED }, 'user-1', ADMIN, []);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CustomerStatus.ARCHIVED }),
        }),
      );
    });

    it('applies search filter', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      await service.findAll({ search: 'acme' }, 'user-1', ADMIN, []);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyName: expect.objectContaining({ contains: 'acme' }),
          }),
        }),
      );
    });

    it('uses default page=1, pageSize=20', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      await service.findAll({}, 'user-1', ADMIN, []);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('findOne', () => {
    it('returns customer with _counts for admin', async () => {
      const customerWithCounts = {
        ...mockCustomer,
        _count: { contacts: 2, activities: 5, opportunities: 1, tasks: 3 },
      };
      mockPrisma.customer.findFirst.mockResolvedValue(customerWithCounts);

      const result = await service.findOne('cust-1', 'user-1', ADMIN, []);

      expect(result.id).toBe('cust-1');
      expect(result._count).toBeDefined();
    });

    it('throws NotFoundException when customer does not exist', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1', ADMIN, [])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when REP does not own the customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        ownerId: 'other-user',
        _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
      });

      await expect(service.findOne('cust-1', 'user-1', REP, [])).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    it('creates customer with PROSPECT status and actor as owner by default', async () => {
      mockPrisma.customer.create.mockResolvedValue(mockCustomer);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.create({ companyName: 'Acme Corp' }, 'user-1');

      expect(mockPrisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CustomerStatus.PROSPECT,
            ownerId: 'user-1',
          }),
        }),
      );
      expect(result.companyName).toBe('Acme Corp');
    });

    it('uses provided ownerId when specified', async () => {
      mockPrisma.customer.create.mockResolvedValue({ ...mockCustomer, ownerId: 'other-user' });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      await service.create({ companyName: 'Acme Corp', ownerId: 'other-user' }, 'user-1');

      expect(mockPrisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ownerId: 'other-user' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates customer fields', async () => {
      const updated = { ...mockCustomer, companyName: 'Acme Updated' };
      mockPrisma.customer.findFirst.mockResolvedValue({ ...mockCustomer, _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 } });
      mockPrisma.customer.update.mockResolvedValue(updated);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.update('cust-1', { companyName: 'Acme Updated' }, 'user-1', ADMIN, []);

      expect(result.companyName).toBe('Acme Updated');
    });

    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.update('non-existent', { companyName: 'X' }, 'user-1', ADMIN, [])).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('allows PROSPECT → ACTIVE transition', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ ...mockCustomer, _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 } });
      mockPrisma.customer.update.mockResolvedValue({ ...mockCustomer, status: CustomerStatus.ACTIVE });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        'cust-1',
        { status: CustomerStatus.ACTIVE },
        'user-1',
        ADMIN,
        [],
      );

      expect(result.status).toBe(CustomerStatus.ACTIVE);
    });

    it('throws ConflictException for invalid transition (PROSPECT → INACTIVE)', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ ...mockCustomer, _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 } });

      await expect(
        service.updateStatus(
          'cust-1',
          { status: CustomerStatus.INACTIVE },
          'user-1',
          ADMIN,
          [],
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when customer is already ARCHIVED', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        status: CustomerStatus.ARCHIVED,
        _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
      });

      await expect(
        service.updateStatus(
          'cust-1',
          { status: CustomerStatus.ACTIVE },
          'user-1',
          ADMIN,
          [],
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('archive', () => {
    it('sets status to ARCHIVED and closes open opportunities', async () => {
      const activeCustomer = { ...mockCustomer, status: CustomerStatus.ACTIVE, _count: { contacts: 0, activities: 0, opportunities: 2, tasks: 0 } };
      mockPrisma.customer.findFirst.mockResolvedValue(activeCustomer);
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
      mockPrisma.opportunity.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.customer.update.mockResolvedValue({ ...mockCustomer, status: CustomerStatus.ARCHIVED });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.archive('cust-1', 'user-1', MANAGER);

      expect(result.status).toBe(CustomerStatus.ARCHIVED);
    });

    it('throws NotFoundException when customer does not exist', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.archive('non-existent', 'user-1', MANAGER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unarchive', () => {
    it('sets status to INACTIVE for archived customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        status: CustomerStatus.ARCHIVED,
        _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
      });
      mockPrisma.customer.update.mockResolvedValue({ ...mockCustomer, status: CustomerStatus.INACTIVE });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.unarchive('cust-1', 'user-1');

      expect(result.status).toBe(CustomerStatus.INACTIVE);
    });

    it('throws ConflictException when customer is not ARCHIVED', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        status: CustomerStatus.ACTIVE,
        _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
      });

      await expect(service.unarchive('cust-1', 'user-1')).rejects.toThrow(ConflictException);
    });
  });
});
