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

const ADMIN_EMAIL = 'test-contacts-admin@integration.test';
const ADMIN_PASSWORD = 'AdminPass@Integration1';
const REP_EMAIL = 'test-contacts-rep@integration.test';

async function loginAsAdmin(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.body.data.accessToken as string;
}

describe('Contacts — integration', () => {
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
      create: { email: ADMIN_EMAIL, passwordHash: adminHash, firstName: 'Cont', lastName: 'Admin', status: 'ACTIVE', roleId: adminRole.id },
      update: { passwordHash: adminHash, status: 'ACTIVE' },
    });
    adminId = admin.id;

    const rep = await prisma.user.upsert({
      where: { email: REP_EMAIL },
      create: { email: REP_EMAIL, firstName: 'Cont', lastName: 'Rep', status: 'ACTIVE', roleId: repRole.id },
      update: { status: 'ACTIVE' },
    });
    repId = rep.id;

    // Create a test customer owned by admin
    const customer = await prisma.customer.create({
      data: { companyName: 'IntTest-ContactCo', status: 'ACTIVE', ownerId: adminId },
    });
    customerId = customer.id;

    adminToken = await loginAsAdmin(app);
    repToken = generateToken(repId, REP_EMAIL, 'SALES_REPRESENTATIVE', []);
  });

  afterAll(async () => {
    await prisma.contact.deleteMany({ where: { firstName: { startsWith: 'IntTest-' } } });
    await prisma.customer.deleteMany({ where: { companyName: 'IntTest-ContactCo' } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/contacts', () => {
    it('creates a contact as admin and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'IntTest-Sarah', lastName: 'Lee', email: 'sarah@acme.com', customerId });

      expect(res.status).toBe(201);
      expect(res.body.data.firstName).toBe('IntTest-Sarah');
      expect(res.body.data.customer.companyName).toBe('IntTest-ContactCo');

      await prisma.contact.delete({ where: { id: res.body.data.id as string } });
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'IntTest-Sarah', customerId });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent customerId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'IntTest-X', lastName: 'Y', customerId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });

    it('returns 403 when REP tries to add contact to other owner customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${repToken}`)
        .send({ firstName: 'IntTest-Z', lastName: 'W', customerId });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/contacts', () => {
    let contactId: string;

    beforeAll(async () => {
      const c = await prisma.contact.create({
        data: { firstName: 'IntTest-ListContact', lastName: 'Test', customerId },
      });
      contactId = c.id;
    });

    afterAll(async () => {
      await prisma.contact.delete({ where: { id: contactId } });
    });

    it('returns paginated list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('filters by customerId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/contacts?customerId=${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const ids = (res.body.data as { id: string }[]).map((c) => c.id);
      expect(ids).toContain(contactId);
    });
  });

  describe('GET /api/v1/contacts/:id', () => {
    let contactId: string;

    beforeAll(async () => {
      const c = await prisma.contact.create({
        data: { firstName: 'IntTest-GetOne', lastName: 'Contact', customerId },
      });
      contactId = c.id;
    });

    afterAll(async () => {
      await prisma.contact.delete({ where: { id: contactId } });
    });

    it('returns contact details for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(contactId);
      expect(res.body.data._count).toBeDefined();
    });

    it('returns 403 when REP does not own parent customer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent contact', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/contacts/:id', () => {
    let contactId: string;

    beforeAll(async () => {
      const c = await prisma.contact.create({
        data: { firstName: 'IntTest-Patch', lastName: 'Contact', customerId },
      });
      contactId = c.id;
    });

    afterAll(async () => {
      await prisma.contact.delete({ where: { id: contactId } });
    });

    it('updates contact fields', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ designation: 'CTO', department: 'Engineering' });

      expect(res.status).toBe(200);
      expect(res.body.data.designation).toBe('CTO');
      expect(res.body.data.department).toBe('Engineering');
    });
  });

  describe('DELETE /api/v1/contacts/:id', () => {
    it('soft-deletes a contact (returns 204)', async () => {
      const c = await prisma.contact.create({
        data: { firstName: 'IntTest-Delete', lastName: 'Me', customerId },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/contacts/${c.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify soft-deleted (not findable without explicit deletedAt filter)
      const found = await prisma.contact.findFirst({ where: { id: c.id, deletedAt: null } });
      expect(found).toBeNull();

      // Cleanup raw
      await prisma.contact.delete({ where: { id: c.id } });
    });

    it('returns 403 when SALES_REPRESENTATIVE tries to delete', async () => {
      const c = await prisma.contact.create({
        data: { firstName: 'IntTest-RepDel', lastName: 'Nope', customerId },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/contacts/${c.id}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);

      await prisma.contact.delete({ where: { id: c.id } });
    });
  });
});
