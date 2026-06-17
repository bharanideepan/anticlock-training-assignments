import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockContactsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const adminActor = {
  sub: 'actor-admin-id',
  email: 'admin@example.com',
  role: RoleName.SYSTEM_ADMINISTRATOR,
  teamIds: [] as string[],
};

const mockContact = {
  id: 'cont-1',
  firstName: 'Sarah',
  lastName: 'Lee',
  customerId: 'cust-1',
  customer: { id: 'cust-1', companyName: 'Acme Corp', ownerId: 'u1' },
  _count: { activities: 0, opportunities: 0 },
};

describe('ContactsController', () => {
  let controller: ContactsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [{ provide: ContactsService, useValue: mockContactsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContactsController>(ContactsController);
  });

  describe('GET /contacts', () => {
    it('returns paginated contacts', async () => {
      const pagedResult = { data: [mockContact], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } };
      mockContactsService.findAll.mockResolvedValue(pagedResult);

      const result = await controller.findAll({}, adminActor as never);

      expect(result).toEqual(pagedResult);
    });
  });

  describe('POST /contacts', () => {
    it('creates a contact and returns 201 envelope', async () => {
      mockContactsService.create.mockResolvedValue(mockContact);

      const result = await controller.create(
        { firstName: 'Sarah', lastName: 'Lee', customerId: 'cust-1' },
        adminActor as never,
      );

      expect(result).toEqual({ data: mockContact });
    });
  });

  describe('GET /contacts/:id', () => {
    it('returns single contact wrapped in { data }', async () => {
      mockContactsService.findOne.mockResolvedValue(mockContact);

      const result = await controller.findOne('cont-1', adminActor as never);

      expect(result).toEqual({ data: mockContact });
    });

    it('propagates NotFoundException', async () => {
      mockContactsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('bad', adminActor as never)).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /contacts/:id', () => {
    it('updates and returns { data }', async () => {
      const updated = { ...mockContact, designation: 'CTO' };
      mockContactsService.update.mockResolvedValue(updated);

      const result = await controller.update('cont-1', { designation: 'CTO' }, adminActor as never);

      expect(result).toEqual({ data: updated });
    });
  });

  describe('DELETE /contacts/:id', () => {
    it('returns 204 and calls remove', async () => {
      mockContactsService.remove.mockResolvedValue(undefined);

      await controller.remove('cont-1', adminActor as never);

      expect(mockContactsService.remove).toHaveBeenCalledWith(
        'cont-1', adminActor.sub, adminActor.role, adminActor.teamIds,
      );
    });
  });
});
