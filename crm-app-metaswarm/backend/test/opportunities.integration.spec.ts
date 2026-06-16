import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { SamlStrategy } from '../src/auth/strategies/saml.strategy';
import { OidcStrategy } from '../src/auth/strategies/oidc.strategy';

const ADMIN_EMAIL = 'test-opp-admin@integration.test';
const ADMIN_PASSWORD = 'AdminPass@Integration1';
const REP_EMAIL = 'test-opp-rep@integration.test';

async function loginAsAdmin(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.body.data.accessToken as string;
}

describe('Opportunities — integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  let adminId: string;
  let repId: string;
  let customerId: string;
  let defaultStageId: string;

  let adminToken: string;
  let repToken: string;

  function generateToken(userId: string, email: string, role: string, teamIds: string[]): string {
    return jwtService.sign({ sub: userId, email, role, teamIds });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SamlStrategy).useValue({ validate: () => null })
      .overrideProvider(OidcStrategy).useValue({ validate: () => null })
      .overrideProvider('MAILER_SERVICE').useValue({ sendMail: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await prisma.$connect();

    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SYSTEM_ADMINISTRATOR' } });
    const repRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SALES_REPRESENTATIVE' } });

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: { email: ADMIN_EMAIL, passwordHash: adminHash, firstName: 'Opp', lastName: 'Admin', status: 'ACTIVE', roleId: adminRole.id },
      update: { passwordHash: adminHash, status: 'ACTIVE' },
    });
    adminId = admin.id;

    const rep = await prisma.user.upsert({
      where: { email: REP_EMAIL },
      create: { email: REP_EMAIL, firstName: 'Opp', lastName: 'Rep', status: 'ACTIVE', roleId: repRole.id },
      update: { status: 'ACTIVE' },
    });
    repId = rep.id;

    const customer = await prisma.customer.create({
      data: { companyName: 'IntTest-OppCo', status: 'ACTIVE', ownerId: adminId },
    });
    customerId = customer.id;

    const defaultStage = await prisma.pipelineStage.findFirstOrThrow({ where: { isDefault: true } });
    defaultStageId = defaultStage.id;

    adminToken = await loginAsAdmin(app);
    repToken = generateToken(repId, REP_EMAIL, 'SALES_REPRESENTATIVE', []);
  });

  afterAll(async () => {
    await prisma.opportunity.deleteMany({ where: { customer: { companyName: 'IntTest-OppCo' } } });
    await prisma.customer.deleteMany({ where: { companyName: 'IntTest-OppCo' } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/opportunities', () => {
    it('creates opportunity at default stage and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'IntTest-Deal Alpha', customerId });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('IntTest-Deal Alpha');
      expect(res.body.data.stage.id).toBe(defaultStageId);
      expect(res.body.data.owner.id).toBe(adminId);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'IntTest-X', customerId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });

    it('returns 401 for unauthenticated request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .send({ name: 'IntTest-Y', customerId });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/opportunities', () => {
    let oppId: string;

    beforeAll(async () => {
      const opp = await prisma.opportunity.create({
        data: { name: 'IntTest-ListOpp', customerId, ownerId: adminId, stageId: defaultStageId },
      });
      oppId = opp.id;
    });

    afterAll(async () => {
      await prisma.opportunity.delete({ where: { id: oppId } });
    });

    it('returns paginated list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('REP sees empty list when they own no opportunities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      const ids = (res.body.data as { id: string }[]).map((o) => o.id);
      expect(ids).not.toContain(oppId);
    });
  });

  describe('GET /api/v1/opportunities/:id', () => {
    let oppId: string;

    beforeAll(async () => {
      const opp = await prisma.opportunity.create({
        data: { name: 'IntTest-GetOneOpp', customerId, ownerId: adminId, stageId: defaultStageId },
      });
      oppId = opp.id;
    });

    afterAll(async () => {
      await prisma.opportunity.delete({ where: { id: oppId } });
    });

    it('returns opportunity details for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(oppId);
      expect(res.body.data.stage).toBeDefined();
      expect(res.body.data.owner).toBeDefined();
    });

    it('returns 403 when REP does not own the opportunity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent opportunity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/opportunities/:id', () => {
    let oppId: string;

    beforeAll(async () => {
      const opp = await prisma.opportunity.create({
        data: { name: 'IntTest-PatchOpp', customerId, ownerId: adminId, stageId: defaultStageId },
      });
      oppId = opp.id;
    });

    afterAll(async () => {
      await prisma.opportunity.delete({ where: { id: oppId } });
    });

    it('updates opportunity fields', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'IntTest-Updated Deal', probability: 75 });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('IntTest-Updated Deal');
      expect(res.body.data.probability).toBe(75);
    });
  });

  describe('PATCH /api/v1/opportunities/:id/stage', () => {
    let oppId: string;
    let qualifiedStageId: string;

    beforeAll(async () => {
      const opp = await prisma.opportunity.create({
        data: { name: 'IntTest-MoveStage', customerId, ownerId: adminId, stageId: defaultStageId },
      });
      oppId = opp.id;

      const qStage = await prisma.pipelineStage.findFirst({ where: { name: 'Qualified' } });
      qualifiedStageId = qStage?.id ?? defaultStageId;
    });

    afterAll(async () => {
      await prisma.opportunity.delete({ where: { id: oppId } });
    });

    it('moves opportunity to Qualified stage', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/opportunities/${oppId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stageId: qualifiedStageId });

      expect(res.status).toBe(200);
      expect(res.body.data.stage.id).toBe(qualifiedStageId);
    });

    it('returns 409 when trying to move to a terminal stage via /stage', async () => {
      const wonStage = await prisma.pipelineStage.findFirst({ where: { name: 'Won' } });
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/opportunities/${oppId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stageId: wonStage?.id });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/opportunities/:id/close/won', () => {
    let oppId: string;

    beforeAll(async () => {
      const opp = await prisma.opportunity.create({
        data: { name: 'IntTest-CloseWon', customerId, ownerId: adminId, stageId: defaultStageId },
      });
      oppId = opp.id;
    });

    afterAll(async () => {
      await prisma.opportunity.delete({ where: { id: oppId } });
    });

    it('closes opportunity as Won', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/opportunities/${oppId}/close/won`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ closeNote: 'Signed!' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage.terminalOutcome).toBe('WON');
      expect(res.body.data.closeNote).toBe('Signed!');
    });
  });

  describe('GET /api/v1/pipeline', () => {
    it('returns pipeline board with stages', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/pipeline')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('stage');
        expect(res.body.data[0]).toHaveProperty('opportunities');
        expect(res.body.data[0]).toHaveProperty('totalValue');
        expect(res.body.data[0]).toHaveProperty('count');
      }
    });
  });

  describe('GET /api/v1/pipeline/stages', () => {
    it('returns all pipeline stages ordered', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/pipeline/stages')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    });
  });
});
