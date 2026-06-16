import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerStatus, RoleName } from '@prisma/client';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockCustomersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  archive: jest.fn(),
  unarchive: jest.fn(),
};

const adminActor = {
  sub: 'actor-admin-id',
  email: 'admin@example.com',
  role: RoleName.SYSTEM_ADMINISTRATOR,
  teamIds: [] as string[],
};

const repActor = {
  sub: 'actor-rep-id',
  email: 'rep@example.com',
  role: RoleName.SALES_REPRESENTATIVE,
  teamIds: [] as string[],
};

const mockCustomer = {
  id: 'cust-1',
  companyName: 'Acme Corp',
  industry: 'Technology',
  status: CustomerStatus.PROSPECT,
  ownerId: 'actor-rep-id',
  owner: { id: 'actor-rep-id', firstName: 'Jane', lastName: 'Doe' },
  _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
};

describe('CustomersController', () => {
  let controller: CustomersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: mockCustomersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  describe('GET /customers', () => {
    it('returns paginated customers wrapped in { data, meta }', async () => {
      const pagedResult = {
        data: [mockCustomer],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      };
      mockCustomersService.findAll.mockResolvedValue(pagedResult);

      const result = await controller.findAll({}, adminActor as never);

      expect(result).toEqual(pagedResult);
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        {},
        adminActor.sub,
        adminActor.role,
        adminActor.teamIds,
      );
    });
  });

  describe('POST /customers', () => {
    it('creates a customer and returns 201 envelope', async () => {
      mockCustomersService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create({ companyName: 'Acme Corp' }, repActor as never);

      expect(result).toEqual({ data: mockCustomer });
      expect(mockCustomersService.create).toHaveBeenCalledWith(
        { companyName: 'Acme Corp' },
        repActor.sub,
      );
    });
  });

  describe('GET /customers/:id', () => {
    it('returns a single customer wrapped in { data }', async () => {
      mockCustomersService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne('cust-1', adminActor as never);

      expect(result).toEqual({ data: mockCustomer });
    });

    it('propagates NotFoundException from service', async () => {
      mockCustomersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('non-existent', adminActor as never)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /customers/:id', () => {
    it('updates a customer and returns { data }', async () => {
      const updated = { ...mockCustomer, companyName: 'Acme Updated' };
      mockCustomersService.update.mockResolvedValue(updated);

      const result = await controller.update(
        'cust-1',
        { companyName: 'Acme Updated' },
        adminActor as never,
      );

      expect(result).toEqual({ data: updated });
    });
  });

  describe('PATCH /customers/:id/status', () => {
    it('updates customer status and returns { data }', async () => {
      const updated = { ...mockCustomer, status: CustomerStatus.ACTIVE };
      mockCustomersService.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateStatus(
        'cust-1',
        { status: CustomerStatus.ACTIVE },
        adminActor as never,
      );

      expect(result).toEqual({ data: updated });
    });

    it('propagates ConflictException for invalid transitions', async () => {
      mockCustomersService.updateStatus.mockRejectedValue(new ConflictException());

      await expect(
        controller.updateStatus('cust-1', { status: CustomerStatus.INACTIVE }, adminActor as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('POST /customers/:id/archive', () => {
    it('archives a customer and returns { data }', async () => {
      const archived = { ...mockCustomer, status: CustomerStatus.ARCHIVED };
      mockCustomersService.archive.mockResolvedValue(archived);

      const result = await controller.archive('cust-1', adminActor as never);

      expect(result).toEqual({ data: archived });
      expect(mockCustomersService.archive).toHaveBeenCalledWith(
        'cust-1',
        adminActor.sub,
        adminActor.role,
      );
    });
  });

  describe('POST /customers/:id/unarchive', () => {
    it('unarchives a customer and returns { data }', async () => {
      const unarchived = { ...mockCustomer, status: CustomerStatus.INACTIVE };
      mockCustomersService.unarchive.mockResolvedValue(unarchived);

      const result = await controller.unarchive('cust-1', adminActor as never);

      expect(result).toEqual({ data: unarchived });
      expect(mockCustomersService.unarchive).toHaveBeenCalledWith('cust-1', adminActor.sub);
    });
  });
});
