import {
  PrismaClient,
  RoleName,
  CustomerStatus,
  ActivityType,
  TaskType,
  TaskStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ── Fetch existing base data ──────────────────────────────────────────────
  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r]));

  const stages = await prisma.pipelineStage.findMany({ orderBy: { displayOrder: 'asc' } });
  const stageMap = Object.fromEntries(stages.map((s) => [s.name, s]));

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@crm.local' } });

  // ── Teams ─────────────────────────────────────────────────────────────────
  const teamWest = await prisma.team.upsert({
    where: { name: 'West Coast Sales' },
    update: {},
    create: { name: 'West Coast Sales' },
  });
  const teamEast = await prisma.team.upsert({
    where: { name: 'East Coast Sales' },
    update: {},
    create: { name: 'East Coast Sales' },
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('Demo@123456', 10);

  async function upsertUser(
    email: string,
    firstName: string,
    lastName: string,
    roleName: RoleName,
    teamIds: string[],
  ) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: hash,
          status: 'ACTIVE',
          roleId: roleMap[roleName].id,
        },
      });
    }
    for (const teamId of teamIds) {
      await prisma.teamMember.upsert({
        where: { userId_teamId: { userId: user.id, teamId } },
        update: {},
        create: { userId: user.id, teamId },
      });
    }
    return user;
  }

  const mgr1 = await upsertUser('sarah.west@crm.local', 'Sarah', 'West', RoleName.SALES_MANAGER, [teamWest.id]);
  const mgr2 = await upsertUser('james.east@crm.local', 'James', 'East', RoleName.SALES_MANAGER, [teamEast.id]);
  const rep1 = await upsertUser('alice.rep@crm.local', 'Alice', 'Chen', RoleName.SALES_REPRESENTATIVE, [teamWest.id]);
  const rep2 = await upsertUser('bob.rep@crm.local', 'Bob', 'Patel', RoleName.SALES_REPRESENTATIVE, [teamWest.id]);
  const rep3 = await upsertUser('carol.rep@crm.local', 'Carol', 'Nguyen', RoleName.SALES_REPRESENTATIVE, [teamEast.id]);
  const sup1 = await upsertUser('dave.sup@crm.local', 'Dave', 'Kim', RoleName.SUPPORT_REPRESENTATIVE, [teamEast.id]);

  // ── Customers ─────────────────────────────────────────────────────────────
  async function upsertCustomer(
    companyName: string,
    industry: string,
    status: CustomerStatus,
    ownerId: string,
    extra: Record<string, unknown> = {},
  ) {
    const existing = await prisma.customer.findFirst({ where: { companyName, deletedAt: null } });
    if (existing) return existing;
    return prisma.customer.create({
      data: { companyName, industry, status, ownerId, ...extra },
    });
  }

  const acme = await upsertCustomer('Acme Corporation', 'Manufacturing', CustomerStatus.ACTIVE, rep1.id, {
    website: 'https://acme.example.com', city: 'San Francisco', state: 'CA', country: 'US',
    revenueRange: 'ONE_M_10M',
  });
  const globalTech = await upsertCustomer('GlobalTech Solutions', 'Technology', CustomerStatus.ACTIVE, rep1.id, {
    website: 'https://globaltech.example.com', city: 'Austin', state: 'TX', country: 'US',
    revenueRange: 'TEN_M_50M',
  });
  const meridian = await upsertCustomer('Meridian Health', 'Healthcare', CustomerStatus.ACTIVE, rep2.id, {
    city: 'Boston', state: 'MA', country: 'US', revenueRange: 'FIFTY_M_250M',
  });
  const novanet = await upsertCustomer('Novanet Logistics', 'Transportation', CustomerStatus.PROSPECT, rep3.id, {
    city: 'Chicago', state: 'IL', country: 'US', revenueRange: 'ONE_M_10M',
  });
  const blueRidge = await upsertCustomer('Blue Ridge Capital', 'Finance', CustomerStatus.ACTIVE, rep3.id, {
    city: 'New York', state: 'NY', country: 'US', revenueRange: 'OVER_250M',
  });
  const sunriseRetail = await upsertCustomer('Sunrise Retail Group', 'Retail', CustomerStatus.INACTIVE, rep2.id, {
    city: 'Dallas', state: 'TX', country: 'US', revenueRange: 'TEN_M_50M',
  });
  const pioneer = await upsertCustomer('Pioneer Energy', 'Energy', CustomerStatus.PROSPECT, rep1.id, {
    city: 'Houston', state: 'TX', country: 'US', revenueRange: 'FIFTY_M_250M',
  });

  // ── Contacts ──────────────────────────────────────────────────────────────
  async function upsertContact(
    firstName: string, lastName: string, email: string,
    designation: string, customerId: string, extra: Record<string, unknown> = {},
  ) {
    const existing = await prisma.contact.findFirst({ where: { email, deletedAt: null } });
    if (existing) return existing;
    return prisma.contact.create({
      data: { firstName, lastName, email, designation, customerId, ...extra },
    });
  }

  const c1 = await upsertContact('Jennifer', 'Adams', 'j.adams@acme.example.com', 'VP of Operations', acme.id, { phone: '+1-415-555-0101', department: 'Operations' });
  const c2 = await upsertContact('Michael', 'Torres', 'm.torres@acme.example.com', 'CTO', acme.id, { phone: '+1-415-555-0102', department: 'Technology' });
  const c3 = await upsertContact('Lisa', 'Zhang', 'l.zhang@globaltech.example.com', 'CEO', globalTech.id, { phone: '+1-512-555-0201', department: 'Executive' });
  const c4 = await upsertContact('Ryan', 'Patel', 'r.patel@globaltech.example.com', 'Head of Procurement', globalTech.id, { phone: '+1-512-555-0202', department: 'Procurement' });
  const c5 = await upsertContact('Emily', 'Watson', 'e.watson@meridian.example.com', 'CFO', meridian.id, { phone: '+1-617-555-0301', department: 'Finance' });
  const c6 = await upsertContact('Carlos', 'Rivera', 'c.rivera@novanet.example.com', 'Director of Logistics', novanet.id, { phone: '+1-312-555-0401' });
  const c7 = await upsertContact('Sophie', 'Miller', 's.miller@blueridge.example.com', 'Managing Director', blueRidge.id, { phone: '+1-212-555-0501', department: 'Investment' });

  // ── Opportunities ─────────────────────────────────────────────────────────
  async function upsertOpportunity(
    name: string, customerId: string, ownerId: string,
    stageName: string, revenue: number, probability: number,
    contactId?: string, extra: Record<string, unknown> = {},
  ) {
    const existing = await prisma.opportunity.findFirst({ where: { name, customerId, deletedAt: null } });
    if (existing) return existing;
    return prisma.opportunity.create({
      data: {
        name, customerId, ownerId, stageId: stageMap[stageName].id,
        expectedRevenue: revenue, probability, contactId: contactId ?? null,
        expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        ...extra,
      },
    });
  }

  const opp1 = await upsertOpportunity('Acme ERP Upgrade', acme.id, rep1.id, 'Proposal', 85000, 65, c1.id);
  const opp2 = await upsertOpportunity('Acme Cloud Migration', acme.id, rep1.id, 'Negotiation', 140000, 80, c2.id);
  const opp3 = await upsertOpportunity('GlobalTech Platform License', globalTech.id, rep1.id, 'Qualified', 220000, 50, c3.id);
  const opp4 = await upsertOpportunity('GlobalTech Support Contract', globalTech.id, rep2.id, 'Lead', 45000, 30, c4.id);
  const opp5 = await upsertOpportunity('Meridian Analytics Suite', meridian.id, rep2.id, 'Proposal', 310000, 70, c5.id);
  const opp6 = await upsertOpportunity('Novanet Fleet Management', novanet.id, rep3.id, 'Lead', 95000, 25, c6.id);
  const opp7 = await upsertOpportunity('Blue Ridge Data Platform', blueRidge.id, rep3.id, 'Negotiation', 500000, 85, c7.id);
  const opp8 = await upsertOpportunity('Pioneer Energy IoT', pioneer.id, rep1.id, 'Qualified', 175000, 45);

  // ── Activities ────────────────────────────────────────────────────────────
  async function createActivityIfNotExists(
    type: ActivityType, subject: string, customerId: string,
    createdById: string, daysAgo: number, contactId?: string,
  ) {
    const existing = await prisma.activity.findFirst({ where: { subject, customerId, deletedAt: null } });
    if (existing) return existing;
    const scheduledAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return prisma.activity.create({
      data: { type, subject, customerId, createdById, scheduledAt, contactId: contactId ?? null },
    });
  }

  await createActivityIfNotExists(ActivityType.MEETING, 'Kickoff Meeting - ERP Upgrade', acme.id, rep1.id, 14, c1.id);
  await createActivityIfNotExists(ActivityType.PHONE_CALL, 'Discovery Call - Cloud Migration scope', acme.id, rep1.id, 10, c2.id);
  await createActivityIfNotExists(ActivityType.EMAIL, 'Sent proposal for Cloud Migration', acme.id, rep1.id, 7, c2.id);
  await createActivityIfNotExists(ActivityType.MEETING, 'Platform License demo', globalTech.id, rep1.id, 5, c3.id);
  await createActivityIfNotExists(ActivityType.NOTE, 'Customer requested custom integrations', globalTech.id, rep1.id, 3, c3.id);
  await createActivityIfNotExists(ActivityType.MEETING, 'Analytics Suite requirements review', meridian.id, rep2.id, 8, c5.id);
  await createActivityIfNotExists(ActivityType.PHONE_CALL, 'Follow up on Meridian proposal', meridian.id, rep2.id, 2, c5.id);
  await createActivityIfNotExists(ActivityType.MEETING, 'Novanet intro call', novanet.id, rep3.id, 6, c6.id);
  await createActivityIfNotExists(ActivityType.MEETING, 'Blue Ridge negotiation session', blueRidge.id, rep3.id, 1, c7.id);
  await createActivityIfNotExists(ActivityType.EMAIL, 'Pioneer Energy initial outreach', pioneer.id, rep1.id, 20);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async function createTaskIfNotExists(
    type: TaskType, title: string, assigneeId: string, createdById: string,
    dueDaysFromNow: number, status: TaskStatus = TaskStatus.OPEN,
    customerId?: string, opportunityId?: string,
  ) {
    const existing = await prisma.task.findFirst({ where: { title, assigneeId, deletedAt: null } });
    if (existing) return existing;
    const dueDate = new Date(Date.now() + dueDaysFromNow * 24 * 60 * 60 * 1000);
    return prisma.task.create({
      data: {
        type, title, status, assigneeId, createdById: createdById,
        dueDate,
        customerId: customerId ?? null,
        opportunityId: opportunityId ?? null,
      },
    });
  }

  await createTaskIfNotExists(TaskType.CALL, 'Call Jennifer re: ERP timeline', rep1.id, rep1.id, 2, TaskStatus.OPEN, acme.id, opp1.id);
  await createTaskIfNotExists(TaskType.FOLLOW_UP, 'Send final contract to Acme CTO', rep1.id, mgr1.id, 5, TaskStatus.OPEN, acme.id, opp2.id);
  await createTaskIfNotExists(TaskType.MEETING, 'GlobalTech executive demo', rep1.id, rep1.id, 7, TaskStatus.OPEN, globalTech.id, opp3.id);
  await createTaskIfNotExists(TaskType.EMAIL, 'Send Meridian pricing breakdown', rep2.id, rep2.id, 1, TaskStatus.OPEN, meridian.id, opp5.id);
  await createTaskIfNotExists(TaskType.FOLLOW_UP, 'Follow up Blue Ridge negotiation', rep3.id, rep3.id, 3, TaskStatus.OPEN, blueRidge.id, opp7.id);
  await createTaskIfNotExists(TaskType.CALL, 'Pioneer Energy intro call', rep1.id, rep1.id, -2, TaskStatus.OPEN, pioneer.id, opp8.id);
  await createTaskIfNotExists(TaskType.INTERNAL_ACTION, 'Prepare Novanet ROI analysis', rep3.id, mgr2.id, 4, TaskStatus.OPEN, novanet.id, opp6.id);
  await createTaskIfNotExists(TaskType.FOLLOW_UP, 'Quarterly check-in with GlobalTech', rep2.id, mgr1.id, 14, TaskStatus.OPEN, globalTech.id);
  await createTaskIfNotExists(TaskType.MEETING, 'Acme ERP onboarding planning', rep1.id, rep1.id, -5, TaskStatus.COMPLETED, acme.id, opp1.id);
  await createTaskIfNotExists(TaskType.EMAIL, 'Send Blue Ridge NDA', rep3.id, rep3.id, -10, TaskStatus.COMPLETED, blueRidge.id, opp7.id);

  // ── Notifications ─────────────────────────────────────────────────────────
  async function createNotificationIfNotExists(userId: string, title: string, body: string) {
    const existing = await prisma.notification.findFirst({ where: { userId, title } });
    if (existing) return;
    await prisma.notification.create({
      data: { userId, title, body, type: 'OVERDUE_TASK', isRead: false },
    });
  }

  await createNotificationIfNotExists(rep1.id, 'Task overdue', 'Pioneer Energy intro call is overdue');
  await createNotificationIfNotExists(rep1.id, 'Opportunity update', 'Acme Cloud Migration moved to Negotiation');
  await createNotificationIfNotExists(rep2.id, 'Task due soon', 'Send Meridian pricing breakdown due tomorrow');
  await createNotificationIfNotExists(rep3.id, 'Deal milestone', 'Blue Ridge Capital deal reached $500k');
  await createNotificationIfNotExists(admin.id, 'New user registered', '6 new users provisioned today');

  console.log('Demo seed completed: 2 teams, 6 users, 7 customers, 7 contacts, 8 opportunities, 10 activities, 10 tasks, 5 notifications');
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
