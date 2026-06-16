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

const ADMIN_EMAIL = 'test-activities-admin@integration.test';
const ADMIN_PASSWORD = 'AdminPass@Integration1';
const REP_EMAIL = 'test-activities-rep@integration.test';

async function loginAsAdmin(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.body.data.accessToken as string;
}

describe('Activities — integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  let adminId: string;
  let repId: string;
  let customerId: string;
  let contactId: string;

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
      create: { email: ADMIN_EMAIL, passwordHash: adminHash, firstName: 'Act', lastName: 'Admin', status: 'ACTIVE', roleId: adminRole.id },
      update: { passwordHash: adminHash, status: 'ACTIVE' },
    });
    adminId = admin.id;

    const rep = await prisma.user.upsert({
      where: { email: REP_EMAIL },
      create: { email: REP_EMAIL, firstName: 'Act', lastName: 'Rep', status: 'ACTIVE', roleId: repRole.id },
      update: { status: 'ACTIVE' },
    });
    repId = rep.id;

    const customer = await prisma.customer.create({
      data: { companyName: 'IntTest-ActivityCo', status: 'ACTIVE', ownerId: adminId },
    });
    customerId = customer.id;

    const contact = await prisma.contact.create({
      data: { firstName: 'IntTest-ActContact', lastName: 'Person', customerId },
    });
    contactId = contact.id;

    adminToken = await loginAsAdmin(app);
    repToken = generateToken(repId, REP_EMAIL, 'SALES_REPRESENTATIVE', []);
  });

  afterAll(async () => {
    await prisma.activity.deleteMany({ where: { customer: { companyName: 'IntTest-ActivityCo' } } });
    await prisma.contact.deleteMany({ where: { firstName: { startsWith: 'IntTest-' }, customerId } });
    await prisma.customer.deleteMany({ where: { companyName: 'IntTest-ActivityCo' } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/activities', () => {
    it('creates an activity as admin and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'PHONE_CALL', subject: 'IntTest-Call with customer', customerId });

      expect(res.status).toBe(201);
      expect(res.body.data.subject).toBe('IntTest-Call with customer');
      expect(res.body.data.type).toBe('PHONE_CALL');
      expect(res.body.data.customer.id).toBe(customerId);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'PHONE_CALL', customerId });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent customerId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'MEETING', subject: 'IntTest-X', customerId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });

    it('returns 401 for unauthenticated request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .send({ type: 'NOTE', subject: 'IntTest-Y', customerId });

      expect(res.status).toBe(401);
    });

    it('creates activity with contact linked', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'EMAIL', subject: 'IntTest-Email to contact', customerId, contactId });

      expect(res.status).toBe(201);
      expect(res.body.data.contact.id).toBe(contactId);
    });

    it('returns 409 when contact does not belong to customer', async () => {
      const otherCustomer = await prisma.customer.create({
        data: { companyName: 'IntTest-OtherCo', status: 'ACTIVE', ownerId: adminId },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'MEETING', subject: 'IntTest-Bad contact', customerId: otherCustomer.id, contactId });

      expect(res.status).toBe(409);

      await prisma.customer.delete({ where: { id: otherCustomer.id } });
    });
  });

  describe('GET /api/v1/activities', () => {
    let activityId: string;

    beforeAll(async () => {
      const a = await prisma.activity.create({
        data: { type: 'NOTE', subject: 'IntTest-ListActivity', customerId, createdById: adminId },
      });
      activityId = a.id;
    });

    afterAll(async () => {
      await prisma.activity.delete({ where: { id: activityId } });
    });

    it('returns paginated list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('REP only sees own activities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      const ids = (res.body.data as { id: string }[]).map((a) => a.id);
      expect(ids).not.toContain(activityId);
    });

    it('filters by type', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/activities?type=NOTE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const types = (res.body.data as { type: string }[]).map((a) => a.type);
      expect(types.every((t) => t === 'NOTE')).toBe(true);
    });
  });

  describe('GET /api/v1/activities/:id', () => {
    let activityId: string;

    beforeAll(async () => {
      const a = await prisma.activity.create({
        data: { type: 'FOLLOW_UP', subject: 'IntTest-GetOne', customerId, createdById: adminId },
      });
      activityId = a.id;
    });

    afterAll(async () => {
      await prisma.activity.delete({ where: { id: activityId } });
    });

    it('returns activity details for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/activities/${activityId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(activityId);
      expect(res.body.data.customer).toBeDefined();
      expect(res.body.data.createdBy).toBeDefined();
    });

    it('returns 403 when REP did not create the activity and does not own the customer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/activities/${activityId}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent activity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/activities/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/activities/:id', () => {
    let activityId: string;

    beforeAll(async () => {
      const a = await prisma.activity.create({
        data: { type: 'MEETING', subject: 'IntTest-PatchMe', customerId, createdById: adminId },
      });
      activityId = a.id;
    });

    afterAll(async () => {
      await prisma.activity.delete({ where: { id: activityId } });
    });

    it('updates activity fields as creator (admin)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/activities/${activityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ subject: 'IntTest-Updated subject', durationMinutes: 30 });

      expect(res.status).toBe(200);
      expect(res.body.data.subject).toBe('IntTest-Updated subject');
      expect(res.body.data.durationMinutes).toBe(30);
    });

    it('returns 403 when non-creator REP tries to update', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/activities/${activityId}`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({ subject: 'IntTest-REP update' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/activities/:id', () => {
    it('soft-deletes activity as creator and returns 204', async () => {
      const a = await prisma.activity.create({
        data: { type: 'NOTE', subject: 'IntTest-DeleteMe', customerId, createdById: adminId },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/activities/${a.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const found = await prisma.activity.findFirst({ where: { id: a.id, deletedAt: null } });
      expect(found).toBeNull();

      await prisma.activity.delete({ where: { id: a.id } });
    });

    it('returns 403 when non-creator REP tries to delete', async () => {
      const a = await prisma.activity.create({
        data: { type: 'NOTE', subject: 'IntTest-RepDelNope', customerId, createdById: adminId },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/activities/${a.id}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);

      await prisma.activity.delete({ where: { id: a.id } });
    });
  });
});
