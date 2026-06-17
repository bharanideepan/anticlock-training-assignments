import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  $queryRaw: jest.fn(),
  activity: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const adminActor = {
  sub: 'user-1',
  email: 'admin@test.com',
  role: RoleName.SYSTEM_ADMINISTRATOR,
  teamIds: [] as string[],
};

const repActor = {
  sub: 'user-2',
  email: 'rep@test.com',
  role: RoleName.SALES_REPRESENTATIVE,
  teamIds: [] as string[],
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.activity.findMany.mockResolvedValue([]);
    mockPrisma.activity.count.mockResolvedValue(0);
    mockPrisma.task.findMany.mockResolvedValue([]);
    mockPrisma.task.count.mockResolvedValue(0);

    const module = await Test.createTestingModule({
      providers: [SearchService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(SearchService);
  });

  it('throws BadRequestException for query shorter than 2 characters', async () => {
    await expect(service.search(adminActor, { q: 'a' })).rejects.toThrow(BadRequestException);
  });

  it('returns all 5 groups when no types filter', async () => {
    const result = await service.search(adminActor, { q: 'acme' });

    expect(result).toHaveProperty('customers');
    expect(result).toHaveProperty('contacts');
    expect(result).toHaveProperty('opportunities');
    expect(result).toHaveProperty('activities');
    expect(result).toHaveProperty('tasks');
    expect(result.query).toBe('acme');
    expect(result.totalResults).toBe(0);
  });

  it('maps customer rows to search result items', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        { id: 'cust-1', companyName: 'Acme Corp', status: 'ACTIVE', industry: 'Technology', totalCount: BigInt(1) },
      ])
      .mockResolvedValueOnce([]) // contacts
      .mockResolvedValueOnce([]); // opportunities

    const result = await service.search(adminActor, { q: 'acme' });

    expect(result.customers.total).toBe(1);
    expect(result.customers.items[0]).toMatchObject({
      id: 'cust-1',
      type: 'customer',
      title: 'Acme Corp',
      subtitle: 'Technology · ACTIVE',
      url: '/customers/cust-1',
    });
  });

  it('maps contact rows to search result items', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([]) // customers
      .mockResolvedValueOnce([
        { id: 'cont-1', firstName: 'Sarah', lastName: 'Lee', designation: 'VP of Sales', companyName: 'Acme Corp', totalCount: BigInt(1) },
      ])
      .mockResolvedValueOnce([]); // opportunities

    const result = await service.search(adminActor, { q: 'sarah' });

    expect(result.contacts.total).toBe(1);
    expect(result.contacts.items[0]).toMatchObject({
      id: 'cont-1',
      type: 'contact',
      title: 'Sarah Lee',
      subtitle: 'Acme Corp · VP of Sales',
      url: '/contacts/cont-1',
    });
  });

  it('maps opportunity rows to search result items', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([]) // customers
      .mockResolvedValueOnce([]) // contacts
      .mockResolvedValueOnce([
        { id: 'opp-1', name: 'Acme Renewal', stageName: 'Negotiation', expectedRevenue: '125000', totalCount: BigInt(1) },
      ]);

    const result = await service.search(adminActor, { q: 'acme' });

    expect(result.opportunities.total).toBe(1);
    expect(result.opportunities.items[0]).toMatchObject({
      id: 'opp-1',
      type: 'opportunity',
      title: 'Acme Renewal',
      url: '/opportunities/opp-1',
    });
    expect(result.opportunities.items[0].subtitle).toContain('Negotiation');
  });

  it('maps activity rows to search result items', async () => {
    mockPrisma.activity.findMany.mockResolvedValue([
      { id: 'act-1', subject: 'Sales call with Acme', type: 'PHONE_CALL', description: null },
    ]);
    mockPrisma.activity.count.mockResolvedValue(1);

    const result = await service.search(adminActor, { q: 'acme' });

    expect(result.activities.total).toBe(1);
    expect(result.activities.items[0]).toMatchObject({
      id: 'act-1',
      type: 'activity',
      title: 'Sales call with Acme',
      subtitle: 'PHONE_CALL',
      url: '/activities/act-1',
    });
  });

  it('maps task rows to search result items', async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      { id: 'task-1', title: 'Follow up with Acme', type: 'FOLLOW_UP', status: 'OPEN' },
    ]);
    mockPrisma.task.count.mockResolvedValue(1);

    const result = await service.search(adminActor, { q: 'acme' });

    expect(result.tasks.total).toBe(1);
    expect(result.tasks.items[0]).toMatchObject({
      id: 'task-1',
      type: 'task',
      title: 'Follow up with Acme',
      subtitle: 'FOLLOW_UP · OPEN',
      url: '/tasks/task-1',
    });
  });

  it('skips entity types not in the types filter', async () => {
    const result = await service.search(adminActor, { q: 'test', types: 'customer,activity' });

    expect(result.contacts.total).toBe(0);
    expect(result.contacts.items).toHaveLength(0);
    expect(result.opportunities.total).toBe(0);
    expect(result.tasks.total).toBe(0);
    // $queryRaw called once for customers only, not contacts/opportunities
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('calculates totalResults as sum of all group totals', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        { id: 'c1', companyName: 'Acme', status: 'ACTIVE', industry: null, totalCount: BigInt(3) },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.search(adminActor, { q: 'acme' });

    expect(result.totalResults).toBe(3);
  });

  it('applies REP visibility — passes actorId to activity query', async () => {
    await service.search(repActor, { q: 'test' });

    expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdById: repActor.sub }),
      }),
    );
  });
});
