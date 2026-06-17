import { PrismaClient } from '@prisma/client';

describe('Database seed', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds 5 roles', async () => {
    const roles = await prisma.role.findMany();
    expect(roles).toHaveLength(5);
    const names = roles.map((r) => r.name);
    expect(names).toContain('SYSTEM_ADMINISTRATOR');
    expect(names).toContain('SALES_MANAGER');
    expect(names).toContain('SALES_REPRESENTATIVE');
    expect(names).toContain('SUPPORT_REPRESENTATIVE');
    expect(names).toContain('READ_ONLY');
  });

  it('seeds 6 pipeline stages in correct order', async () => {
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    expect(stages).toHaveLength(6);
    expect(stages[0].name).toBe('Lead');
    expect(stages[0].isDefault).toBe(true);
    expect(stages[4].name).toBe('Won');
    expect(stages[4].isTerminal).toBe(true);
    expect(stages[4].terminalOutcome).toBe('WON');
    expect(stages[5].name).toBe('Lost');
    expect(stages[5].isTerminal).toBe(true);
    expect(stages[5].terminalOutcome).toBe('LOST');
  });

  it('seeds 1 system administrator user', async () => {
    const adminRole = await prisma.role.findUnique({
      where: { name: 'SYSTEM_ADMINISTRATOR' },
    });
    expect(adminRole).toBeDefined();

    const admin = await prisma.user.findFirst({
      where: { roleId: adminRole!.id },
    });
    expect(admin).toBeDefined();
    expect(admin!.email).toBe('admin@crm.local');
    expect(admin!.passwordHash).not.toBeNull();
    expect(admin!.status).toBe('ACTIVE');
  });
});
