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

// Unique email prefix to avoid conflicts with other integration test files
const ADMIN_EMAIL = 'test-users-admin@integration.test';
const MANAGER_EMAIL = 'test-users-manager@integration.test';
const REP_EMAIL = 'test-users-rep@integration.test';
const ADMIN_PASSWORD = 'AdminPass@Integration1';

/** Login as admin via the real login endpoint (email/password only works for SYSTEM_ADMINISTRATOR). */
async function loginAsAdmin(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.body.data.accessToken as string;
}

describe('Users — integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  let adminId: string;
  let managerId: string;
  let repId: string;
  let teamId: string; // shared team for manager/rep visibility tests

  // Roles
  let adminRoleId: string;
  let managerRoleId: string;
  let repRoleId: string;

  /**
   * Generate a signed JWT for non-admin users (SALES_MANAGER, SALES_REPRESENTATIVE).
   * These roles cannot login via email/password (SSO-only per spec), so we sign
   * a token directly using the app's JwtService.
   */
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

    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    await prisma.$connect();

    // Resolve role IDs
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SYSTEM_ADMINISTRATOR' } });
    const managerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SALES_MANAGER' } });
    const repRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SALES_REPRESENTATIVE' } });
    adminRoleId = adminRole.id;
    managerRoleId = managerRole.id;
    repRoleId = repRole.id;

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user (can login via email/password)
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: {
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        firstName: 'Test',
        lastName: 'Admin',
        status: 'ACTIVE',
        roleId: adminRoleId,
      },
      update: { passwordHash: adminHash, status: 'ACTIVE' },
    });
    adminId = admin.id;

    // Create a team so manager and rep can be added to it for visibility tests
    const team = await prisma.team.create({
      data: { name: `Users Integration Test Team ${Date.now()}` },
    });
    teamId = team.id;

    // Create manager user (no password — token generated directly)
    const manager = await prisma.user.upsert({
      where: { email: MANAGER_EMAIL },
      create: {
        email: MANAGER_EMAIL,
        firstName: 'Test',
        lastName: 'Manager',
        status: 'ACTIVE',
        roleId: managerRoleId,
      },
      update: { status: 'ACTIVE' },
    });
    managerId = manager.id;

    // Create rep user
    const rep = await prisma.user.upsert({
      where: { email: REP_EMAIL },
      create: {
        email: REP_EMAIL,
        firstName: 'Test',
        lastName: 'Rep',
        status: 'ACTIVE',
        roleId: repRoleId,
      },
      update: { status: 'ACTIVE' },
    });
    repId = rep.id;

    // Add both manager and rep to the shared team
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: managerId, teamId } },
      create: { userId: managerId, teamId },
      update: {},
    });
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: repId, teamId } },
      create: { userId: repId, teamId },
      update: {},
    });
  });

  afterAll(async () => {
    const userIds = [adminId, managerId, repId].filter(Boolean);

    // Clean up any ad-hoc users created during tests
    const adHocUsers = await prisma.user.findMany({
      where: { email: { contains: 'test-users-new@integration.test' } },
      select: { id: true },
    });
    const allUserIds = [...new Set([...userIds, ...adHocUsers.map((u) => u.id)])];

    await prisma.refreshToken.deleteMany({ where: { userId: { in: allUserIds } } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: allUserIds } } });
    await prisma.auditLog.deleteMany({ where: { resourceId: { in: allUserIds } } });
    await prisma.teamMember.deleteMany({ where: { teamId } });
    await prisma.teamMember.deleteMany({ where: { userId: { in: allUserIds } } });
    await prisma.team.deleteMany({ where: { id: teamId } });
    await prisma.user.deleteMany({ where: { id: { in: allUserIds } } });

    await prisma.$disconnect();
    await app.close();
  });

  // ─── GET /api/v1/users ────────────────────────────────────────────────────────
  describe('GET /api/v1/users', () => {
    it('returns 401 without JWT', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users');
      expect(res.status).toBe(401);
    });

    it('admin sees all users (200)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.meta).toMatchObject({
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        totalPages: expect.any(Number),
      });
      // Admin should see at least our 3 test users
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('manager sees only team-scoped users (200)', async () => {
      // Manager's JWT must include the teamId so the service scopes visibility correctly
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', [teamId]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.any(Array));
      // Manager should only see users in their team
      const emails = (res.body.data as Array<{ email: string }>).map((u) => u.email);
      // Both manager and rep are in the same team
      expect(emails).toContain(MANAGER_EMAIL);
      expect(emails).toContain(REP_EMAIL);
      // Admin is NOT in the team — manager should NOT see admin
      expect(emails).not.toContain(ADMIN_EMAIL);
    });

    it('returns 403 for SALES_REPRESENTATIVE role', async () => {
      const token = generateToken(repId, REP_EMAIL, 'SALES_REPRESENTATIVE', [teamId]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── POST /api/v1/users ───────────────────────────────────────────────────────
  describe('POST /api/v1/users', () => {
    let createdUserId: string;

    afterEach(async () => {
      if (createdUserId) {
        await prisma.passwordResetToken.deleteMany({ where: { userId: createdUserId } });
        await prisma.teamMember.deleteMany({ where: { userId: createdUserId } });
        await prisma.user.deleteMany({ where: { id: createdUserId } });
        createdUserId = '';
      }
    });

    it('admin creates a user (201)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'test-users-new@integration.test',
          firstName: 'New',
          lastName: 'User',
          roleId: repRoleId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        email: 'test-users-new@integration.test',
        firstName: 'New',
        lastName: 'User',
      });
      createdUserId = (res.body.data as { id: string }).id;
    });

    it('returns 409 on duplicate email', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: ADMIN_EMAIL, // already exists
          firstName: 'Duplicate',
          lastName: 'User',
          roleId: repRoleId,
        });

      expect(res.status).toBe(409);
    });

    it('returns 403 for non-admin role', async () => {
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', [teamId]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'test-users-forbidden@integration.test',
          firstName: 'Forbidden',
          lastName: 'User',
          roleId: repRoleId,
        });

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /api/v1/users/:id ────────────────────────────────────────────────────
  describe('GET /api/v1/users/:id', () => {
    it('admin retrieves any user (200)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${repId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: repId, email: REP_EMAIL });
    });

    it('manager retrieves own-team user (200)', async () => {
      // Manager's JWT includes the team — rep is in the same team
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', [teamId]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${repId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: repId });
    });

    it('manager gets 403 for out-of-team user', async () => {
      // Manager's JWT has only their team — admin is NOT in that team
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', [teamId]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for missing id', async () => {
      const token = await loginAsAdmin(app);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /api/v1/users/:id ─────────────────────────────────────────────────
  describe('PATCH /api/v1/users/:id', () => {
    it('admin updates name/phone/jobTitle (200)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${repId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Updated', phone: '+1-555-9999', jobTitle: 'Senior Rep' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: repId,
        firstName: 'Updated',
        phone: '+1-555-9999',
        jobTitle: 'Senior Rep',
      });

      // Restore original values
      await prisma.user.update({
        where: { id: repId },
        data: { firstName: 'Test', phone: null, jobTitle: null },
      });
    });

    it('returns 404 for missing id', async () => {
      const token = await loginAsAdmin(app);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/v1/users/:id/deactivate ───────────────────────────────────────
  describe('POST /api/v1/users/:id/deactivate', () => {
    it('admin deactivates a user (204)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${repId}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      const user = await prisma.user.findUnique({ where: { id: repId } });
      expect(user?.status).toBe('INACTIVE');

      // Reactivate for subsequent tests
      await prisma.user.update({ where: { id: repId }, data: { status: 'ACTIVE' } });
    });

    it('returns 409 when admin tries to deactivate themselves', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
    });
  });

  // ─── POST /api/v1/users/:id/reactivate ───────────────────────────────────────
  describe('POST /api/v1/users/:id/reactivate', () => {
    it('admin reactivates a deactivated user (204)', async () => {
      const token = await loginAsAdmin(app);

      // Deactivate via Prisma directly
      await prisma.user.update({ where: { id: repId }, data: { status: 'INACTIVE' } });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${repId}/reactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      const user = await prisma.user.findUnique({ where: { id: repId } });
      expect(user?.status).toBe('ACTIVE');
    });

    it('returns 404 for missing user', async () => {
      const token = await loginAsAdmin(app);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${nonExistentId}/reactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/v1/users/:id/reset-password ───────────────────────────────────
  describe('POST /api/v1/users/:id/reset-password', () => {
    afterEach(async () => {
      // Clean up password reset tokens
      await prisma.passwordResetToken.deleteMany({ where: { userId: { in: [repId, managerId] } } });
    });

    it('admin triggers password reset (202)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${repId}/reset-password`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(202);
    });

    it('returns 404 for missing user', async () => {
      const token = await loginAsAdmin(app);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${nonExistentId}/reset-password`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /api/v1/users/:id/role ────────────────────────────────────────────
  describe('PATCH /api/v1/users/:id/role', () => {
    it('admin changes user role (200) and role field is updated', async () => {
      const token = await loginAsAdmin(app);

      // Change rep's role to SALES_MANAGER
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${repId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: managerRoleId });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: repId,
        role: expect.objectContaining({ name: 'SALES_MANAGER' }),
      });

      // Restore original role
      await prisma.user.update({ where: { id: repId }, data: { roleId: repRoleId } });
    });

    it('returns 400 for non-existent role', async () => {
      const token = await loginAsAdmin(app);
      const nonExistentRoleId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${repId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: nonExistentRoleId });

      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH /api/v1/users/:id/teams ───────────────────────────────────────────
  describe('PATCH /api/v1/users/:id/teams', () => {
    it('admin replaces team memberships atomically (200)', async () => {
      const token = await loginAsAdmin(app);

      // Create a second team for this test
      const secondTeam = await prisma.team.create({
        data: { name: `Users Integration Second Team ${Date.now()}` },
      });

      try {
        const res = await request(app.getHttpServer())
          .patch(`/api/v1/users/${repId}/teams`)
          .set('Authorization', `Bearer ${token}`)
          .send({ teamIds: [secondTeam.id] });

        expect(res.status).toBe(200);
        const memberships = (
          res.body.data as { teamMemberships: Array<{ teamId: string }> }
        ).teamMemberships;
        const memberTeamIds = memberships.map((m) => m.teamId);
        expect(memberTeamIds).toContain(secondTeam.id);
        expect(memberTeamIds).not.toContain(teamId);
      } finally {
        // Restore rep to original team
        await prisma.teamMember.deleteMany({ where: { userId: repId } });
        await prisma.teamMember.create({ data: { userId: repId, teamId } });
        await prisma.teamMember.deleteMany({ where: { teamId: secondTeam.id } });
        await prisma.team.delete({ where: { id: secondTeam.id } });
      }
    });

    it('admin can clear all team memberships (200)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${managerId}/teams`)
        .set('Authorization', `Bearer ${token}`)
        .send({ teamIds: [] });

      expect(res.status).toBe(200);
      const memberships = (
        res.body.data as { teamMemberships: Array<{ teamId: string }> }
      ).teamMemberships;
      expect(memberships).toHaveLength(0);

      // Restore manager's team membership
      await prisma.teamMember.upsert({
        where: { userId_teamId: { userId: managerId, teamId } },
        create: { userId: managerId, teamId },
        update: {},
      });
    });

    it('returns 403 for non-admin role', async () => {
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', [teamId]);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${repId}/teams`)
        .set('Authorization', `Bearer ${token}`)
        .send({ teamIds: [] });

      expect(res.status).toBe(403);
    });
  });
});
