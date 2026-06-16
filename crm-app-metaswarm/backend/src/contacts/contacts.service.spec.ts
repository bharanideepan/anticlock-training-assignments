import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  contact: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const ADMIN = RoleName.SYSTEM_ADMINISTRATOR;
const MANAGER = RoleName.SALES_MANAGER;
const REP = RoleName.SALES_REPRESENTATIVE;

const mockCustomer = {
  id: 'cust-1',
  companyName: 'Acme Corp',
  ownerId: 'user-1',
  deletedAt: null,
};

const mockContact = {
  id: 'cont-1',
  firstName: 'Sarah',
  lastName: 'Lee',
  email: 'sarah@acme.com',
  phone: '+1-555-0401',
  designation: 'VP of Sales',
  department: 'Sales',
  notes: 'Key decision maker',
  customerId: 'cust-1',
  customer: { id: 'cust-1', companyName: 'Acme Corp', ownerId: 'user-1' },
  searchVector: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  _count: { activities: 0, opportunities: 0 },
};

describe('ContactsService', () => {
  let service: ContactsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  describe('findAll', () => {
    it('returns paginated contacts for admin', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([mockContact]);
      mockPrisma.contact.count.mockResolvedValue(1);

      const result = await service.findAll({}, 'user-1', ADMIN, []);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by customerId', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([mockContact]);
      mockPrisma.contact.count.mockResolvedValue(1);

      await service.findAll({ customerId: 'cust-1' }, 'user-1', ADMIN, []);

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'cust-1' }),
        }),
      );
    });

    it('applies search filter on name and email', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      await service.findAll({ search: 'sarah' }, 'user-1', ADMIN, []);

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });

    it('scopes via customer owner for SALES_REPRESENTATIVE', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      await service.findAll({}, 'user-1', REP, []);

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customer: expect.objectContaining({ ownerId: 'user-1' }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns contact for admin', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(mockContact);

      const result = await service.findOne('cont-1', 'user-1', ADMIN, []);

      expect(result.id).toBe('cont-1');
    });

    it('throws NotFoundException when contact does not exist', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(service.findOne('bad', 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when REP does not own the parent customer', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        ...mockContact,
        customer: { id: 'cust-1', companyName: 'Acme', ownerId: 'other-user' },
      });

      await expect(service.findOne('cont-1', 'user-1', REP, [])).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates contact after validating customer exists', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.contact.create.mockResolvedValue(mockContact);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.create(
        { firstName: 'Sarah', lastName: 'Lee', customerId: 'cust-1' },
        'user-1',
        ADMIN,
        [],
      );

      expect(result.firstName).toBe('Sarah');
      expect(mockPrisma.contact.create).toHaveBeenCalled();
    });

    it('throws NotFoundException when customer does not exist', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ firstName: 'Sarah', lastName: 'Lee', customerId: 'bad-cust' }, 'user-1', ADMIN, []),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when REP tries to add contact to other owner customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ ...mockCustomer, ownerId: 'other-user' });

      await expect(
        service.create({ firstName: 'Sarah', lastName: 'Lee', customerId: 'cust-1' }, 'user-1', REP, []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates contact fields', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(mockContact);
      mockPrisma.contact.update.mockResolvedValue({ ...mockContact, designation: 'CTO' });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.update('cont-1', { designation: 'CTO' }, 'user-1', ADMIN, []);

      expect(result.designation).toBe('CTO');
    });

    it('throws NotFoundException when contact not found', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(service.update('bad', { designation: 'CTO' }, 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(mockContact);
      mockPrisma.contact.update.mockResolvedValue({ ...mockContact, deletedAt: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);

      await service.remove('cont-1', 'user-1', MANAGER, []);

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('throws NotFoundException when contact not found', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(service.remove('bad', 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });
  });
});
