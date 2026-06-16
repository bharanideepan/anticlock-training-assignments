import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { SamlStrategy } from '../src/auth/strategies/saml.strategy';
import { OidcStrategy } from '../src/auth/strategies/oidc.strategy';

const TEST_EMAIL = 'test-auth-admin@integration.test';
const TEST_PASSWORD = 'TestPass@12345';

describe('Auth — integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

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

    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    await prisma.$connect();

    // Create isolated test admin user (idempotent)
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SYSTEM_ADMINISTRATOR' } });
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      create: {
        email: TEST_EMAIL,
        passwordHash,
        firstName: 'Test',
        lastName: 'Admin',
        status: 'ACTIVE',
        roleId: adminRole.id,
      },
      update: { passwordHash, status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  // ─── POST /auth/login ────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('returns 200 with accessToken and sets crm_refresh cookie on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        accessToken: expect.any(String),
        expiresIn: 900,
        user: expect.objectContaining({ email: TEST_EMAIL }),
      });
      expect(res.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringContaining('crm_refresh=')]),
      );
    });

    it('returns 401 on wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPassword!' });

      expect(res.status).toBe(401);
    });

    it('returns 401 on unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'AnyPass123!' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Full token lifecycle: login → me → refresh → logout ────────────────────
  describe('Token lifecycle', () => {
    let accessToken: string;
    let refreshCookie: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      accessToken = res.body.data.accessToken as string;
      const cookies = res.headers['set-cookie'] as unknown as string[];
      refreshCookie = cookies.find((c: string) => c.startsWith('crm_refresh=')) ?? '';
    });

    afterEach(async () => {
      // Clean up any refresh tokens left after each test
      const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
      if (user) {
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      }
    });

    it('GET /api/v1/auth/me returns user profile with valid JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ email: TEST_EMAIL });
    });

    it('GET /api/v1/auth/me returns 401 without JWT', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/auth/refresh rotates token and returns new accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        accessToken: expect.any(String),
        expiresIn: 900,
      });
      // New cookie should be set (rotation)
      expect(res.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringContaining('crm_refresh=')]),
      );
    });

    it('POST /api/v1/auth/refresh returns 401 with invalid cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'crm_refresh=invalid-token-value');

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/auth/logout returns 204 and clears cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshCookie);

      expect(res.status).toBe(204);
      // Cookie should be cleared (set to empty with past expiry)
      const setCookieHeader = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
      const refreshCookieHeader = setCookieHeader.find((c) => c.startsWith('crm_refresh='));
      expect(refreshCookieHeader).toBeDefined();
    });
  });

  // ─── POST /auth/password/reset-request ───────────────────────────────────────
  describe('POST /api/v1/auth/password/reset-request', () => {
    afterEach(async () => {
      const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
      if (user) {
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      }
    });

    it('returns 202 for existing email (prevents enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(202);
    });

    it('returns 202 for non-existent email (prevents enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'ghost@example.com' });

      expect(res.status).toBe(202);
    });
  });

  // ─── PATCH /auth/me ───────────────────────────────────────────────────────────
  describe('PATCH /api/v1/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      accessToken = res.body.data.accessToken as string;
    });

    afterEach(async () => {
      const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
      if (user) {
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
        // Reset firstName
        await prisma.user.update({ where: { id: user.id }, data: { firstName: 'Test' } });
      }
    });

    it('updates profile and returns updated user', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ firstName: 'Updated' });
    });
  });
});
