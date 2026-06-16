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
const ADMIN_EMAIL = 'test-teams-admin@integration.test';
const MANAGER_EMAIL = 'test-teams-manager@integration.test';
const REP_EMAIL = 'test-teams-rep@integration.test';
const ADMIN_PASSWORD = 'AdminPass@Integration1';

/** Login as admin via the real login endpoint (only SYSTEM_ADMINISTRATOR can login with email/password). */
async function loginAsAdmin(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.body.data.accessToken as string;
}

describe('Teams — integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  let adminId: string;
  let managerId: string;
  let repId: string;

  // IDs for teams created during setup or tests — tracked for teardown
  const teamIds: string[] = [];

  // A stable test team for member read/write tests
  let primaryTeamId: string;

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

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin (can login via email/password)
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: {
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        firstName: 'Teams',
        lastName: 'Admin',
        status: 'ACTIVE',
        roleId: adminRole.id,
      },
      update: { passwordHash: adminHash, status: 'ACTIVE' },
    });
    adminId = admin.id;

    // Create manager (token generated directly — no password needed)
    const manager = await prisma.user.upsert({
      where: { email: MANAGER_EMAIL },
      create: {
        email: MANAGER_EMAIL,
        firstName: 'Teams',
        lastName: 'Manager',
        status: 'ACTIVE',
        roleId: managerRole.id,
      },
      update: { status: 'ACTIVE' },
    });
    managerId = manager.id;

    // Create rep (token generated directly — no password needed)
    const rep = await prisma.user.upsert({
      where: { email: REP_EMAIL },
      create: {
        email: REP_EMAIL,
        firstName: 'Teams',
        lastName: 'Rep',
        status: 'ACTIVE',
        roleId: repRole.id,
      },
      update: { status: 'ACTIVE' },
    });
    repId = rep.id;

    // Create the primary stable team for read/member tests
    const primaryTeam = await prisma.team.create({
      data: { name: `Teams Integration Primary ${Date.now()}` },
    });
    primaryTeamId = primaryTeam.id;
    teamIds.push(primaryTeamId);
  });

  afterAll(async () => {
    const userIds = [adminId, managerId, repId].filter(Boolean);

    // Clean up all team members for all tracked teams
    if (teamIds.length > 0) {
      await prisma.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
    }
    await prisma.teamMember.deleteMany({ where: { userId: { in: userIds } } });

    // Hard delete all test teams (including soft-deleted ones).
    // PrismaService has no soft-delete extension, so deleteMany works on soft-deleted rows.
    if (teamIds.length > 0) {
      await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
    }

    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { resourceId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    await prisma.$disconnect();
    await app.close();
  });

  // ─── GET /api/v1/teams ────────────────────────────────────────────────────────
  describe('GET /api/v1/teams', () => {
    it('returns 401 without JWT', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/teams');
      expect(res.status).toBe(401);
    });

    it('admin can access teams list (200)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.meta).toMatchObject({
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('SALES_MANAGER can access teams list (200)', async () => {
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', []);

      const res = await request(app.getHttpServer())
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.any(Array));
    });

    it('SALES_REPRESENTATIVE can access teams list (200)', async () => {
      const token = generateToken(repId, REP_EMAIL, 'SALES_REPRESENTATIVE', []);

      const res = await request(app.getHttpServer())
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.any(Array));
    });
  });

  // ─── GET /api/v1/teams/:id ────────────────────────────────────────────────────
  describe('GET /api/v1/teams/:id', () => {
    it('admin can retrieve a team by id (200)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/teams/${primaryTeamId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: primaryTeamId });
    });

    it('SALES_MANAGER can retrieve a team by id (200)', async () => {
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', []);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/teams/${primaryTeamId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: primaryTeamId });
    });

    it('returns 404 for missing id', async () => {
      const token = await loginAsAdmin(app);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .get(`/api/v1/teams/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/v1/teams ───────────────────────────────────────────────────────
  describe('POST /api/v1/teams', () => {
    it('admin creates a team (201)', async () => {
      const token = await loginAsAdmin(app);
      const teamName = `Teams Integration Create ${Date.now()}`;

      const res = await request(app.getHttpServer())
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: teamName });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: teamName });

      const createdId = (res.body.data as { id: string }).id;
      teamIds.push(createdId);
    });

    it('returns 409 on duplicate team name', async () => {
      const token = await loginAsAdmin(app);

      // Use the primary team's name (already exists in DB)
      const primaryTeam = await prisma.team.findUnique({ where: { id: primaryTeamId } });

      const res = await request(app.getHttpServer())
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: primaryTeam!.name });

      expect(res.status).toBe(409);
    });

    it('returns 403 for SALES_MANAGER', async () => {
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', []);

      const res = await request(app.getHttpServer())
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Teams Integration Forbidden Manager ${Date.now()}` });

      expect(res.status).toBe(403);
    });

    it('returns 403 for SALES_REPRESENTATIVE', async () => {
      const token = generateToken(repId, REP_EMAIL, 'SALES_REPRESENTATIVE', []);

      const res = await request(app.getHttpServer())
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Teams Integration Forbidden Rep ${Date.now()}` });

      expect(res.status).toBe(403);
    });
  });

  // ─── PATCH /api/v1/teams/:id ─────────────────────────────────────────────────
  describe('PATCH /api/v1/teams/:id', () => {
    it('admin updates team name and description (200)', async () => {
      const token = await loginAsAdmin(app);
      const updatedName = `Teams Integration Updated ${Date.now()}`;

      // Create a dedicated team to update
      const teamToUpdate = await prisma.team.create({
        data: { name: `Teams Integration ToUpdate ${Date.now()}` },
      });
      teamIds.push(teamToUpdate.id);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/teams/${teamToUpdate.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: updatedName, description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: teamToUpdate.id,
        name: updatedName,
        description: 'Updated description',
      });
    });

    it('returns 404 for missing team id', async () => {
      const token = await loginAsAdmin(app);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/teams/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Ghost Team' });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /api/v1/teams/:id ─────────────────────────────────────────────────
  describe('DELETE /api/v1/teams/:id', () => {
    it('admin soft-deletes a team (204) and team no longer appears in GET /teams', async () => {
      const token = await loginAsAdmin(app);

      // Create a dedicated team to delete
      const teamToDelete = await prisma.team.create({
        data: { name: `Teams Integration ToDelete ${Date.now()}` },
      });
      teamIds.push(teamToDelete.id);

      // Add a member to verify cascade deletion of TeamMember rows
      await prisma.teamMember.create({
        data: { teamId: teamToDelete.id, userId: repId },
      });

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/teams/${teamToDelete.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).toBe(204);

      // Verify team is NOT returned in GET /teams (service filters deletedAt: null)
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      const responseTeamIds = (listRes.body.data as Array<{ id: string }>).map((t) => t.id);
      expect(responseTeamIds).not.toContain(teamToDelete.id);

      // Verify TeamMember rows were cascade-deleted
      const memberCount = await prisma.teamMember.count({
        where: { teamId: teamToDelete.id },
      });
      expect(memberCount).toBe(0);
    });

    it('returns 404 when deleting an already-soft-deleted team', async () => {
      const token = await loginAsAdmin(app);

      // Create and immediately soft-delete a team directly via Prisma
      const alreadyDeleted = await prisma.team.create({
        data: {
          name: `Teams Integration AlreadyDeleted ${Date.now()}`,
          deletedAt: new Date(),
        },
      });
      teamIds.push(alreadyDeleted.id);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/teams/${alreadyDeleted.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/v1/teams/:id/members ──────────────────────────────────────────
  describe('POST /api/v1/teams/:id/members', () => {
    it('admin adds members to a team (200)', async () => {
      const token = await loginAsAdmin(app);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/teams/${primaryTeamId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userIds: [managerId, repId] });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: primaryTeamId });
      const members = (res.body.data as { members: Array<{ user: { id: string } }> }).members;
      const memberUserIds = members.map((m) => m.user.id);
      expect(memberUserIds).toContain(managerId);
      expect(memberUserIds).toContain(repId);
    });

    it('duplicate member add is idempotent (200)', async () => {
      const token = await loginAsAdmin(app);

      // Ensure repId is already a member
      await prisma.teamMember.upsert({
        where: { userId_teamId: { userId: repId, teamId: primaryTeamId } },
        create: { userId: repId, teamId: primaryTeamId },
        update: {},
      });

      // Add the same user again — should not fail (skipDuplicates in service)
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teams/${primaryTeamId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userIds: [repId] });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: primaryTeamId });
    });

    it('returns 403 for SALES_MANAGER', async () => {
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', []);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/teams/${primaryTeamId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userIds: [repId] });

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent team', async () => {
      const token = await loginAsAdmin(app);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .post(`/api/v1/teams/${nonExistentId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userIds: [repId] });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /api/v1/teams/:id/members/:userId ─────────────────────────────────
  describe('DELETE /api/v1/teams/:id/members/:userId', () => {
    it('admin removes a member from a team (204)', async () => {
      const token = await loginAsAdmin(app);

      // Ensure rep is a member first
      await prisma.teamMember.upsert({
        where: { userId_teamId: { userId: repId, teamId: primaryTeamId } },
        create: { userId: repId, teamId: primaryTeamId },
        update: {},
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/teams/${primaryTeamId}/members/${repId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      const membership = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: repId, teamId: primaryTeamId } },
      });
      expect(membership).toBeNull();
    });

    it('returns 404 if user is not a member of the team', async () => {
      const token = await loginAsAdmin(app);

      // Ensure rep is NOT a member
      await prisma.teamMember.deleteMany({
        where: { userId: repId, teamId: primaryTeamId },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/teams/${primaryTeamId}/members/${repId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('returns 403 for non-admin', async () => {
      const token = generateToken(managerId, MANAGER_EMAIL, 'SALES_MANAGER', []);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/teams/${primaryTeamId}/members/${repId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
