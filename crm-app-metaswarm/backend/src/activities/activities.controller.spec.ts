import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivityType, RoleName } from '@prisma/client';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockActivitiesService = {
  findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(),
};

const adminActor = { sub: 'admin-id', email: 'a@b.com', role: RoleName.SYSTEM_ADMINISTRATOR, teamIds: [] as string[] };

const mockActivity = {
  id: 'act-1', type: ActivityType.PHONE_CALL, subject: 'Call',
  customerId: 'cust-1', customer: { id: 'cust-1', companyName: 'Acme', ownerId: 'u1' },
  contact: null, createdBy: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
};

describe('ActivitiesController', () => {
  let controller: ActivitiesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [{ provide: ActivitiesService, useValue: mockActivitiesService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<ActivitiesController>(ActivitiesController);
  });

  it('GET /activities — returns paginated list', async () => {
    mockActivitiesService.findAll.mockResolvedValue({ data: [mockActivity], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } });
    const result = await controller.findAll({}, adminActor as never);
    expect(result.data).toHaveLength(1);
  });

  it('POST /activities — returns 201 envelope', async () => {
    mockActivitiesService.create.mockResolvedValue(mockActivity);
    const result = await controller.create(
      { type: ActivityType.PHONE_CALL, subject: 'Call', customerId: 'cust-1' },
      adminActor as never,
    );
    expect(result).toEqual({ data: mockActivity });
  });

  it('GET /activities/:id — returns { data }', async () => {
    mockActivitiesService.findOne.mockResolvedValue(mockActivity);
    const result = await controller.findOne('act-1', adminActor as never);
    expect(result).toEqual({ data: mockActivity });
  });

  it('GET /activities/:id — propagates NotFoundException', async () => {
    mockActivitiesService.findOne.mockRejectedValue(new NotFoundException());
    await expect(controller.findOne('bad', adminActor as never)).rejects.toThrow(NotFoundException);
  });

  it('PATCH /activities/:id — returns updated { data }', async () => {
    const updated = { ...mockActivity, subject: 'Updated' };
    mockActivitiesService.update.mockResolvedValue(updated);
    const result = await controller.update('act-1', { subject: 'Updated' }, adminActor as never);
    expect(result).toEqual({ data: updated });
  });

  it('DELETE /activities/:id — calls remove and returns void', async () => {
    mockActivitiesService.remove.mockResolvedValue(undefined);
    await controller.remove('act-1', adminActor as never);
    expect(mockActivitiesService.remove).toHaveBeenCalledWith('act-1', adminActor.sub, adminActor.role, adminActor.teamIds);
  });
});
