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

const ADMIN_EMAIL = 'test-tasks-admin@integration.test';
const ADMIN_PASSWORD = 'AdminPass@Integration1';
const REP_EMAIL = 'test-tasks-rep@integration.test';

describe('Tasks — integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  let adminId: string;
  let repId: string;
  let customerId: string;

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
      create: { email: ADMIN_EMAIL, passwordHash: adminHash, firstName: 'Task', lastName: 'Admin', status: 'ACTIVE', roleId: adminRole.id },
      update: { passwordHash: adminHash, status: 'ACTIVE' },
    });
    adminId = admin.id;

    const rep = await prisma.user.upsert({
      where: { email: REP_EMAIL },
      create: { email: REP_EMAIL, firstName: 'Task', lastName: 'Rep', status: 'ACTIVE', roleId: repRole.id },
      update: { status: 'ACTIVE' },
    });
    repId = rep.id;

    const customer = await prisma.customer.create({
      data: { companyName: 'IntTest-TaskCo', status: 'ACTIVE', ownerId: adminId },
    });
    customerId = customer.id;

    adminToken = generateToken(adminId, ADMIN_EMAIL, 'SYSTEM_ADMINISTRATOR', []);
    repToken = generateToken(repId, REP_EMAIL, 'SALES_REPRESENTATIVE', []);
  });

  afterAll(async () => {
    await prisma.task.deleteMany({
      where: { OR: [{ createdById: adminId }, { createdById: repId }] },
    });
    await prisma.customer.deleteMany({ where: { companyName: 'IntTest-TaskCo' } });
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, REP_EMAIL] } } });
    await prisma.$disconnect();
    await app.close();
  });

  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString();

  let taskId: string;

  describe('POST /api/v1/tasks', () => {
    it('creates task and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'FOLLOW_UP', title: 'Admin follow up', dueDate: futureDate, customerId });
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Admin follow up');
      expect(res.body.data.isOverdue).toBe(false);
      taskId = res.body.data.id as string;
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'FOLLOW_UP' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'FOLLOW_UP', title: 'X', dueDate: futureDate, customerId: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .send({ type: 'FOLLOW_UP', title: 'X', dueDate: futureDate });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('returns all tasks for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
    });

    it('scopes tasks to assignee for SALES_REPRESENTATIVE', async () => {
      const repRes = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${repToken}`);
      expect(repRes.status).toBe(200);
      const allIds = (repRes.body.data as { assigneeId: string }[]).map((t) => t.assigneeId);
      allIds.forEach((id) => expect(id).toBe(repId));
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('returns task with isOverdue for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(taskId);
      expect(res.body.data).toHaveProperty('isOverdue');
    });

    it('returns 404 for non-existent task', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('returns 403 for REP accessing another users task', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${repToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates task title', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated follow up' });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated follow up');
    });

    it('returns 403 for REP updating another users task', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({ title: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/tasks/:id/complete', () => {
    it('completes an OPEN task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completedAt).toBeTruthy();
    });

    it('returns 409 when task already completed', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/tasks/:id/cancel (with a new task)', () => {
    let cancelTaskId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'CALL', title: 'To cancel', dueDate: futureDate });
      cancelTaskId = res.body.data.id as string;
    });

    it('cancels an OPEN task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${cancelTaskId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('soft-deletes a task', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'EMAIL', title: 'To delete', dueDate: futureDate });
      const toDeleteId = createRes.body.data.id as string;

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${toDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(204);

      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${toDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(404);
    });
  });
});
