import { Test } from '@nestjs/testing';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { RoleName } from '@prisma/client';

const mockSearchService = { search: jest.fn() };

const adminActor = {
  sub: 'user-1',
  email: 'admin@test.com',
  role: RoleName.SYSTEM_ADMINISTRATOR,
  teamIds: [],
};

const emptyResults = {
  customers: { items: [], total: 0 },
  contacts: { items: [], total: 0 },
  opportunities: { items: [], total: 0 },
  activities: { items: [], total: 0 },
  tasks: { items: [], total: 0 },
  query: 'acme',
  totalResults: 0,
};

describe('SearchController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSearchService.search.mockResolvedValue(emptyResults);

    const module = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: mockSearchService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: ExecutionContext) => {
        ctx.switchToHttp().getRequest().user = adminActor;
        return true;
      }})
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(() => app.close());

  it('GET /search returns 200 with search results', async () => {
    const res = await request(app.getHttpServer()).get('/search?q=acme');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ query: 'acme', totalResults: 0 });
  });

  it('GET /search with types filter passes types to service', async () => {
    await request(app.getHttpServer()).get('/search?q=acme&types=customer,contact');
    expect(mockSearchService.search).toHaveBeenCalledWith(
      adminActor,
      expect.objectContaining({ q: 'acme', types: 'customer,contact' }),
    );
  });

  it('GET /search returns 400 when q is missing', async () => {
    const res = await request(app.getHttpServer()).get('/search');
    expect(res.status).toBe(400);
  });

  it('GET /search returns 400 when q has only 1 character', async () => {
    const res = await request(app.getHttpServer()).get('/search?q=a');
    expect(res.status).toBe(400);
  });

  it('GET /search passes page and pageSize to service', async () => {
    await request(app.getHttpServer()).get('/search?q=acme&page=2&pageSize=5');
    expect(mockSearchService.search).toHaveBeenCalledWith(
      adminActor,
      expect.objectContaining({ q: 'acme', page: 2, pageSize: 5 }),
    );
  });
});
