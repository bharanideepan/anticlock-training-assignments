import { PrismaClient, RoleName, TerminalOutcome } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Seed roles (5 system roles — idempotent via upsert)
  const roleNames: RoleName[] = [
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
    RoleName.READ_ONLY,
  ];

  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Seed pipeline stages (6 defaults — idempotent via name lookup)
  const stages = [
    { name: 'Lead', displayOrder: 1, isDefault: true, isTerminal: false, terminalOutcome: null },
    { name: 'Qualified', displayOrder: 2, isDefault: false, isTerminal: false, terminalOutcome: null },
    { name: 'Proposal', displayOrder: 3, isDefault: false, isTerminal: false, terminalOutcome: null },
    { name: 'Negotiation', displayOrder: 4, isDefault: false, isTerminal: false, terminalOutcome: null },
    { name: 'Won', displayOrder: 5, isDefault: false, isTerminal: true, terminalOutcome: TerminalOutcome.WON },
    { name: 'Lost', displayOrder: 6, isDefault: false, isTerminal: true, terminalOutcome: TerminalOutcome.LOST },
  ];

  for (const stage of stages) {
    const existing = await prisma.pipelineStage.findFirst({
      where: { name: stage.name, deletedAt: null },
    });
    if (!existing) {
      await prisma.pipelineStage.create({ data: stage });
    }
  }

  // Seed system administrator (idempotent via email lookup)
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.SYSTEM_ADMINISTRATOR },
  });

  const adminEmail = 'admin@crm.local';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123456', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        status: 'ACTIVE',
        roleId: adminRole.id,
      },
    });
  }

  console.log('Seed completed: 5 roles, 6 pipeline stages, 1 admin user');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
