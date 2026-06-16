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

const ADMIN_EMAIL = 'test-customers-admin@integration.test';
const ADMIN_PASSWORD = 'AdminPass@Integration1';
const REP_EMAIL = 'test-customers-rep@integration.test';
const MANAGER_EMAIL = 'test-customers-manager@integration.test';

async function loginAsAdmin(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.body.data.accessToken as string;
}

describe('Customers — integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  let adminId: string;
  let repId: string;
  let managerId: string;

  let adminToken: string;
  let repToken: string;
  let managerToken: string;

  function generateToken(
    userId: string,
    email: string,
    role: string,
    userTeamIds: string[],
  ): string {
    return jwtService.sign({ sub: userId, email, role, teamIds: userTeamIds });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SamlStrategy)
      .useValue({ validate: () => null })
      .overrideProvider(OidcStrategy)
      .useValue({ validate: () => null })
      .overrideProvider('MAILER_SERVICE')
      .useValue({ sendMail: jest.fn().mockResolvedValue(undefined) })
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
    const managerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SALES_MANAGER' } });

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: {
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        firstName: 'Cust',
        lastName: 'Admin',
        status: 'ACTIVE',
        roleId: adminRole.id,
      },
      update: { passwordHash: adminHash, status: 'ACTIVE' },
    });
    adminId = admin.id;

    const rep = await prisma.user.upsert({
      where: { email: REP_EMAIL },
      create: {
        email: REP_EMAIL,
        firstName: 'Cust',
        lastName: 'Rep',
        status: 'ACTIVE',
        roleId: repRole.id,
      },
      update: { status: 'ACTIVE' },
    });
    repId = rep.id;

    const manager = await prisma.user.upsert({
      where: { email: MANAGER_EMAIL },
      create: {
        email: MANAGER_EMAIL,
        firstName: 'Cust',
        lastName: 'Manager',
        status: 'ACTIVE',
        roleId: managerRole.id,
      },
      update: { status: 'ACTIVE' },
    });
    managerId = manager.id;

    adminToken = await loginAsAdmin(app);
    repToken = generateToken(repId, REP_EMAIL, 'SALES_REPRESENTATIVE', []);
    managerToken = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', []);
  });

  afterAll(async () => {
    // Clean up test customers (soft-delete guard means we delete by ID directly)
    await prisma.customer.deleteMany({
      where: { companyName: { startsWith: 'IntTest-' } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  // -------------------------------------------------------------------------
  // POST /customers
  // -------------------------------------------------------------------------
  describe('POST /api/v1/customers', () => {
    it('creates a customer as admin and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ companyName: 'IntTest-Acme', industry: 'Technology' });

      expect(res.status).toBe(201);
      expect(res.body.data.companyName).toBe('IntTest-Acme');
      expect(res.body.data.status).toBe('PROSPECT');
      expect(res.body.data.ownerId).toBe(adminId);

      // Clean up
      await prisma.customer.delete({ where: { id: res.body.data.id as string } });
    });

    it('creates a customer as SALES_REPRESENTATIVE with self as owner', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${repToken}`)
        .send({ companyName: 'IntTest-RepCo' });

      expect(res.status).toBe(201);
      expect(res.body.data.ownerId).toBe(repId);

      await prisma.customer.delete({ where: { id: res.body.data.id as string } });
    });

    it('returns 400 for missing companyName', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ industry: 'Tech' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .send({ companyName: 'IntTest-NoAuth' });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /customers
  // -------------------------------------------------------------------------
  describe('GET /api/v1/customers', () => {
    let custId: string;

    beforeAll(async () => {
      const c = await prisma.customer.create({
        data: {
          companyName: 'IntTest-GetList',
          status: 'PROSPECT',
          ownerId: adminId,
        },
      });
      custId = c.id;
    });

    afterAll(async () => {
      await prisma.customer.delete({ where: { id: custId } });
    });

    it('returns paginated list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('returns 200 for SALES_MANAGER', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
    });

    it('SALES_REPRESENTATIVE only sees own customers', async () => {
      // Rep should NOT see admin's customer
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      const ids = (res.body.data as { id: string }[]).map((c) => c.id);
      expect(ids).not.toContain(custId);
    });
  });

  // -------------------------------------------------------------------------
  // GET /customers/:id
  // -------------------------------------------------------------------------
  describe('GET /api/v1/customers/:id', () => {
    let custId: string;

    beforeAll(async () => {
      const c = await prisma.customer.create({
        data: {
          companyName: 'IntTest-GetOne',
          status: 'PROSPECT',
          ownerId: adminId,
        },
      });
      custId = c.id;
    });

    afterAll(async () => {
      await prisma.customer.delete({ where: { id: custId } });
    });

    it('returns customer details for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/customers/${custId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(custId);
      expect(res.body.data._count).toBeDefined();
    });

    it('returns 403 when REP does not own the customer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/customers/${custId}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent customer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /customers/:id
  // -------------------------------------------------------------------------
  describe('PATCH /api/v1/customers/:id', () => {
    let custId: string;

    beforeAll(async () => {
      const c = await prisma.customer.create({
        data: {
          companyName: 'IntTest-Patch',
          status: 'PROSPECT',
          ownerId: adminId,
        },
      });
      custId = c.id;
    });

    afterAll(async () => {
      await prisma.customer.delete({ where: { id: custId } });
    });

    it('updates companyName for admin', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${custId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ companyName: 'IntTest-PatchUpdated', city: 'Austin' });

      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('IntTest-PatchUpdated');
      expect(res.body.data.city).toBe('Austin');
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /customers/:id/status
  // -------------------------------------------------------------------------
  describe('PATCH /api/v1/customers/:id/status', () => {
    let custId: string;

    beforeAll(async () => {
      const c = await prisma.customer.create({
        data: {
          companyName: 'IntTest-Status',
          status: 'PROSPECT',
          ownerId: adminId,
        },
      });
      custId = c.id;
    });

    afterAll(async () => {
      await prisma.customer.delete({ where: { id: custId } });
    });

    it('transitions PROSPECT → ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${custId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('transitions ACTIVE → INACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${custId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INACTIVE');
    });

    it('returns 409 for invalid transition INACTIVE → ARCHIVED via status endpoint', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${custId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ARCHIVED' });

      // INACTIVE→ARCHIVED not allowed via /status; use /archive instead
      expect(res.status).toBe(409);
    });
  });

  // -------------------------------------------------------------------------
  // POST /customers/:id/archive + /unarchive
  // -------------------------------------------------------------------------
  describe('POST /api/v1/customers/:id/archive and /unarchive', () => {
    let custId: string;

    beforeAll(async () => {
      const c = await prisma.customer.create({
        data: {
          companyName: 'IntTest-Archive',
          status: 'ACTIVE',
          ownerId: adminId,
        },
      });
      custId = c.id;
    });

    afterAll(async () => {
      await prisma.customer.delete({ where: { id: custId } });
    });

    it('archives an ACTIVE customer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/customers/${custId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ARCHIVED');
    });

    it('returns 409 when trying to archive an already-ARCHIVED customer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/customers/${custId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('unarchives the customer back to INACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/customers/${custId}/unarchive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INACTIVE');
    });

    it('returns 403 when SALES_REPRESENTATIVE tries to archive', async () => {
      // Create a customer owned by rep
      const repCust = await prisma.customer.create({
        data: { companyName: 'IntTest-RepArchive', status: 'ACTIVE', ownerId: repId },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/customers/${repCust.id}/archive`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);

      await prisma.customer.delete({ where: { id: repCust.id } });
    });
  });
});
