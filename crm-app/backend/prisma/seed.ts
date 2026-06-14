import {
  PrismaClient,
  RoleName,
  CustomerStatus,
  RevenueRange,
  ActivityType,
  TaskType,
  TaskStatus,
  NotificationType,
  AuditAction,
  TerminalOutcome,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

function future(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function past(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function monthMid(monthsAgo: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15);
}

function monthStart(monthsAgo: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Phase 2 T004: Roles ────────────────────────────────────────────────────
  let rolesSeeded = 0;
  for (const name of Object.values(RoleName)) {
    const existing = await prisma.role.findFirst({ where: { name } });
    if (!existing) {
      await prisma.role.create({ data: { name } });
      rolesSeeded++;
    }
  }
  console.log(`Seeded ${rolesSeeded} roles (${Object.values(RoleName).length} total)`);

  // Load all roles for FK lookups
  const roleMap = new Map<RoleName, string>();
  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.findFirstOrThrow({ where: { name } });
    roleMap.set(name, role.id);
  }

  // ── Phase 2 T005: Pipeline Stages ─────────────────────────────────────────
  const stageDefinitions = [
    { name: 'Lead', displayOrder: 1, isDefault: true, isTerminal: false, terminalOutcome: null },
    { name: 'Qualified', displayOrder: 2, isDefault: false, isTerminal: false, terminalOutcome: null },
    { name: 'Proposal', displayOrder: 3, isDefault: false, isTerminal: false, terminalOutcome: null },
    { name: 'Negotiation', displayOrder: 4, isDefault: false, isTerminal: false, terminalOutcome: null },
    { name: 'Won', displayOrder: 5, isDefault: false, isTerminal: true, terminalOutcome: TerminalOutcome.WON },
    { name: 'Lost', displayOrder: 6, isDefault: false, isTerminal: true, terminalOutcome: TerminalOutcome.LOST },
  ];

  let stagesSeeded = 0;
  for (const stageDef of stageDefinitions) {
    const existing = await prisma.pipelineStage.findFirst({ where: { name: stageDef.name } });
    if (!existing) {
      await prisma.pipelineStage.create({ data: stageDef });
      stagesSeeded++;
    }
  }
  console.log(`Seeded ${stagesSeeded} pipeline stages (${stageDefinitions.length} total)`);

  const stageMap = new Map<string, string>();
  for (const s of stageDefinitions) {
    const stage = await prisma.pipelineStage.findFirst({ where: { name: s.name } });
    if (stage) stageMap.set(s.name, stage.id);
  }

  // ── Phase 3 T006: Users ────────────────────────────────────────────────────
  const userDefs = [
    { email: 'admin@crm.local', password: 'Admin@123', role: RoleName.SYSTEM_ADMINISTRATOR, firstName: 'System', lastName: 'Administrator', jobTitle: 'CRM Administrator' },
    { email: 'manager@crm.local', password: 'Manager@123', role: RoleName.SALES_MANAGER, firstName: 'Sarah', lastName: 'Manager', jobTitle: 'Sales Manager' },
    { email: 'salesrep@crm.local', password: 'SalesRep@123', role: RoleName.SALES_REPRESENTATIVE, firstName: 'John', lastName: 'SalesRep', jobTitle: 'Sales Representative' },
    { email: 'salesrep2@crm.local', password: 'SalesRep2@123', role: RoleName.SALES_REPRESENTATIVE, firstName: 'Jane', lastName: 'SalesRep', jobTitle: 'Sales Representative' },
    { email: 'support@crm.local', password: 'Support@123', role: RoleName.SUPPORT_REPRESENTATIVE, firstName: 'Alex', lastName: 'Support', jobTitle: 'Support Representative' },
    { email: 'readonly@crm.local', password: 'ReadOnly@123', role: RoleName.READ_ONLY, firstName: 'Bob', lastName: 'ReadOnly', jobTitle: 'Read Only User' },
  ];

  let usersSeeded = 0;
  const userMap = new Map<string, string>(); // email → id
  for (const def of userDefs) {
    let user = await prisma.user.findFirst({ where: { email: def.email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(def.password, 10);
      user = await prisma.user.create({
        data: {
          email: def.email,
          passwordHash,
          firstName: def.firstName,
          lastName: def.lastName,
          jobTitle: def.jobTitle,
          roleId: roleMap.get(def.role)!,
        },
      });
      usersSeeded++;
    }
    userMap.set(def.email, user.id);
  }
  console.log(`Seeded ${usersSeeded} users (${userDefs.length} total)`);

  const adminId = userMap.get('admin@crm.local')!;
  const managerId = userMap.get('manager@crm.local')!;
  const salesrepId = userMap.get('salesrep@crm.local')!;
  const salesrep2Id = userMap.get('salesrep2@crm.local')!;
  const supportId = userMap.get('support@crm.local')!;
  const readonlyId = userMap.get('readonly@crm.local')!;

  // ── Phase 3 T007: Team + TeamMembers ──────────────────────────────────────
  let teamsSeeded = 0;
  let membersSeeded = 0;
  let team = await prisma.team.findFirst({ where: { name: 'Alpha Sales Team' } });
  if (!team) {
    team = await prisma.team.create({
      data: { name: 'Alpha Sales Team', description: 'Primary sales team', managerId },
    });
    teamsSeeded++;
  }
  for (const userId of [salesrepId, salesrep2Id]) {
    const existing = await prisma.teamMember.findFirst({ where: { userId, teamId: team.id } });
    if (!existing) {
      await prisma.teamMember.create({ data: { userId, teamId: team.id } });
      membersSeeded++;
    }
  }
  console.log(`Seeded ${teamsSeeded} team with ${membersSeeded} members`);

  // ── Phase 4 T008: Customers ────────────────────────────────────────────────
  const customerDefs = [
    { companyName: 'Acme Corporation', status: CustomerStatus.ACTIVE, industry: 'Technology', revenueRange: RevenueRange.ONE_M_10M, ownerId: salesrepId, city: 'San Francisco', country: 'US' },
    { companyName: 'Beta Logistics', status: CustomerStatus.ACTIVE, industry: 'Logistics', revenueRange: RevenueRange.TEN_M_50M, ownerId: salesrepId, city: 'Chicago', country: 'US' },
    { companyName: 'Gamma Healthcare', status: CustomerStatus.ACTIVE, industry: 'Healthcare', revenueRange: RevenueRange.FIFTY_M_250M, ownerId: salesrepId, city: 'Boston', country: 'US' },
    { companyName: 'Delta Finance', status: CustomerStatus.ACTIVE, industry: 'Finance', revenueRange: RevenueRange.OVER_250M, ownerId: salesrepId, city: 'New York', country: 'US' },
    { companyName: 'Kappa Legal', status: CustomerStatus.ARCHIVED, industry: 'Legal', revenueRange: RevenueRange.ONE_M_10M, ownerId: salesrepId, city: 'Dallas', country: 'US' },
    { companyName: 'Epsilon Retail', status: CustomerStatus.PROSPECT, industry: 'Retail', revenueRange: RevenueRange.UNDER_1M, ownerId: salesrep2Id, city: 'Seattle', country: 'US' },
    { companyName: 'Zeta Manufacturing', status: CustomerStatus.PROSPECT, industry: 'Manufacturing', revenueRange: RevenueRange.ONE_M_10M, ownerId: salesrep2Id, city: 'Detroit', country: 'US' },
    { companyName: 'Eta Education', status: CustomerStatus.PROSPECT, industry: 'Education', revenueRange: RevenueRange.UNDER_1M, ownerId: salesrep2Id, city: 'Austin', country: 'US' },
    { companyName: 'Lambda Consulting', status: CustomerStatus.ARCHIVED, industry: 'Consulting', revenueRange: RevenueRange.UNDER_1M, ownerId: salesrep2Id, city: 'Denver', country: 'US' },
    { companyName: 'Mu Technology', status: CustomerStatus.ACTIVE, industry: 'Technology', revenueRange: RevenueRange.TEN_M_50M, ownerId: salesrep2Id, city: 'Portland', country: 'US' },
    { companyName: 'Theta Energy', status: CustomerStatus.INACTIVE, industry: 'Energy', revenueRange: RevenueRange.TEN_M_50M, ownerId: supportId, city: 'Houston', country: 'US' },
    { companyName: 'Iota Media', status: CustomerStatus.INACTIVE, industry: 'Media', revenueRange: RevenueRange.ONE_M_10M, ownerId: supportId, city: 'Los Angeles', country: 'US' },
  ];

  let customersSeeded = 0;
  const customerMap = new Map<string, string>(); // companyName → id
  for (const def of customerDefs) {
    let customer = await prisma.customer.findFirst({ where: { companyName: def.companyName } });
    if (!customer) {
      customer = await prisma.customer.create({ data: def });
      customersSeeded++;
    }
    customerMap.set(def.companyName, customer.id);
  }
  console.log(`Seeded ${customersSeeded} customers (${customerDefs.length} total)`);

  const acmeId = customerMap.get('Acme Corporation')!;
  const betaId = customerMap.get('Beta Logistics')!;
  const gammaId = customerMap.get('Gamma Healthcare')!;
  const deltaId = customerMap.get('Delta Finance')!;
  const epsilonId = customerMap.get('Epsilon Retail')!;
  const zetaId = customerMap.get('Zeta Manufacturing')!;
  const etaId = customerMap.get('Eta Education')!;
  const thetaId = customerMap.get('Theta Energy')!;
  const iotaId = customerMap.get('Iota Media')!;
  const kappaId = customerMap.get('Kappa Legal')!;
  const muId = customerMap.get('Mu Technology')!;

  // ── Phase 4 T009: Contacts ─────────────────────────────────────────────────
  const contactDefs = [
    { firstName: 'Alice', lastName: 'Acme', email: 'alice@acme.com', designation: 'VP Sales', department: 'Sales', customerId: acmeId },
    { firstName: 'Bob', lastName: 'Acme', email: 'bob@acme.com', designation: 'CTO', department: 'Engineering', customerId: acmeId },
    { firstName: 'Charlie', lastName: 'Beta', email: 'charlie@beta-logistics.com', designation: 'COO', department: 'Operations', customerId: betaId },
    { firstName: 'Diana', lastName: 'Beta', email: 'diana@beta-logistics.com', designation: 'Procurement Manager', department: 'Procurement', customerId: betaId },
    { firstName: 'Eve', lastName: 'Gamma', email: 'eve@gamma-health.com', designation: 'CIO', department: 'IT', customerId: gammaId },
    { firstName: 'Frank', lastName: 'Gamma', email: 'frank@gamma-health.com', designation: 'Director of Operations', department: 'Operations', customerId: gammaId },
    { firstName: 'Grace', lastName: 'Delta', email: 'grace@delta-finance.com', designation: 'CFO', department: 'Finance', customerId: deltaId },
    { firstName: 'Henry', lastName: 'Delta', email: 'henry@delta-finance.com', designation: 'VP Technology', department: 'Technology', customerId: deltaId },
    { firstName: 'Ivy', lastName: 'Epsilon', email: 'ivy@epsilon-retail.com', designation: 'CEO', department: 'Executive', customerId: epsilonId },
    { firstName: 'Jake', lastName: 'Epsilon', email: 'jake@epsilon-retail.com', designation: 'IT Manager', department: 'IT', customerId: epsilonId },
    { firstName: 'Karen', lastName: 'Zeta', email: 'karen@zeta-mfg.com', designation: 'Plant Manager', department: 'Operations', customerId: zetaId },
    { firstName: 'Leo', lastName: 'Zeta', email: 'leo@zeta-mfg.com', designation: 'VP Engineering', department: 'Engineering', customerId: zetaId },
    { firstName: 'Mia', lastName: 'Eta', email: 'mia@eta-edu.com', designation: 'Director of IT', department: 'IT', customerId: etaId },
    { firstName: 'Noah', lastName: 'Eta', email: 'noah@eta-edu.com', designation: 'Dean of Operations', department: 'Operations', customerId: etaId },
    { firstName: 'Olivia', lastName: 'Theta', email: 'olivia@theta-energy.com', designation: 'CTO', department: 'Technology', customerId: thetaId },
    { firstName: 'Paul', lastName: 'Theta', email: 'paul@theta-energy.com', designation: 'Operations Director', department: 'Operations', customerId: thetaId },
    { firstName: 'Quinn', lastName: 'Iota', email: 'quinn@iota-media.com', designation: 'CEO', department: 'Executive', customerId: iotaId },
    { firstName: 'Rachel', lastName: 'Iota', email: 'rachel@iota-media.com', designation: 'Head of Technology', department: 'Technology', customerId: iotaId },
    { firstName: 'Sam', lastName: 'Kappa', email: 'sam@kappa-legal.com', designation: 'Managing Partner', department: 'Leadership', customerId: kappaId },
    { firstName: 'Tina', lastName: 'Kappa', email: 'tina@kappa-legal.com', designation: 'IT Director', department: 'IT', customerId: kappaId },
    { firstName: 'Uma', lastName: 'Mu', email: 'uma@mu-tech.com', designation: 'CTO', department: 'Technology', customerId: muId },
    { firstName: 'Victor', lastName: 'Mu', email: 'victor@mu-tech.com', designation: 'VP Product', department: 'Product', customerId: muId },
  ];

  let contactsSeeded = 0;
  const contactMap = new Map<string, string>(); // `${firstName}-${lastName}-${customerId}` → id
  for (const def of contactDefs) {
    let contact = await prisma.contact.findFirst({
      where: { firstName: def.firstName, lastName: def.lastName, customerId: def.customerId },
    });
    if (!contact) {
      contact = await prisma.contact.create({ data: def });
      contactsSeeded++;
    }
    contactMap.set(`${def.firstName}-${def.lastName}-${def.customerId}`, contact.id);
  }
  console.log(`Seeded ${contactsSeeded} contacts (${contactDefs.length} total)`);

  // Convenience contact ID lookups
  const aliceId = contactMap.get(`Alice-Acme-${acmeId}`)!;
  const charlieId = contactMap.get(`Charlie-Beta-${betaId}`)!;
  const eveId = contactMap.get(`Eve-Gamma-${gammaId}`)!;

  // ── Phase 5 T010: Opportunities ────────────────────────────────────────────
  const leadId = stageMap.get('Lead')!;
  const qualifiedId = stageMap.get('Qualified')!;
  const proposalId = stageMap.get('Proposal')!;
  const negotiationId = stageMap.get('Negotiation')!;
  const wonId = stageMap.get('Won')!;
  const lostId = stageMap.get('Lost')!;

  const opportunityDefs = [
    { name: 'Acme ERP Upgrade', customerId: acmeId, ownerId: salesrepId, stageId: leadId, expectedRevenue: 45000, probability: 15, contactId: aliceId },
    { name: 'Beta Warehouse System', customerId: betaId, ownerId: salesrepId, stageId: leadId, expectedRevenue: 120000, probability: 20, contactId: charlieId },
    { name: 'Beta Fleet Mgmt', customerId: betaId, ownerId: salesrepId, stageId: leadId, expectedRevenue: 90000, probability: 25, contactId: charlieId },
    { name: 'Gamma EMR Platform', customerId: gammaId, ownerId: salesrepId, stageId: qualifiedId, expectedRevenue: 280000, probability: 40, contactId: eveId },
    { name: 'Delta Risk Analytics', customerId: deltaId, ownerId: salesrepId, stageId: qualifiedId, expectedRevenue: 350000, probability: 45 },
    { name: 'Gamma Lab System', customerId: gammaId, ownerId: salesrepId, stageId: qualifiedId, expectedRevenue: 140000, probability: 50, contactId: eveId },
    { name: 'Epsilon POS System', customerId: epsilonId, ownerId: salesrep2Id, stageId: proposalId, expectedRevenue: 18000, probability: 60 },
    { name: 'Zeta Automation Suite', customerId: zetaId, ownerId: salesrep2Id, stageId: proposalId, expectedRevenue: 95000, probability: 65 },
    { name: 'Eta LMS Platform', customerId: etaId, ownerId: salesrep2Id, stageId: negotiationId, expectedRevenue: 22000, probability: 75 },
    { name: 'Theta SCADA Upgrade', customerId: thetaId, ownerId: supportId, stageId: negotiationId, expectedRevenue: 180000, probability: 80 },
    { name: 'Acme Cloud Migration', customerId: acmeId, ownerId: salesrepId, stageId: wonId, expectedRevenue: 78000, probability: 100, actualCloseDate: new Date('2026-03-01') },
    { name: 'Mu Data Platform', customerId: muId, ownerId: salesrep2Id, stageId: wonId, expectedRevenue: 210000, probability: 100, actualCloseDate: new Date('2026-04-15') },
    { name: 'Iota CMS Renewal', customerId: iotaId, ownerId: supportId, stageId: lostId, expectedRevenue: 15000, probability: 0, actualCloseDate: new Date('2026-02-01') },
    { name: 'Kappa Legal Suite', customerId: kappaId, ownerId: salesrepId, stageId: lostId, expectedRevenue: 55000, probability: 0, actualCloseDate: new Date('2026-01-20') },
  ];

  let oppsSeeded = 0;
  const oppMap = new Map<string, string>(); // name → id
  for (const def of opportunityDefs) {
    let opp = await prisma.opportunity.findFirst({ where: { name: def.name, customerId: def.customerId } });
    if (!opp) {
      opp = await prisma.opportunity.create({ data: def });
      oppsSeeded++;
    }
    oppMap.set(def.name, opp.id);
  }
  console.log(`Seeded ${oppsSeeded} opportunities (${opportunityDefs.length} total)`);

  // ── Phase 6 T011: Activities ───────────────────────────────────────────────
  const activityDefs = [
    { type: ActivityType.PHONE_CALL, subject: 'Discovery call with Acme VP Sales', customerId: acmeId, contactId: aliceId, createdById: salesrepId, scheduledAt: new Date('2026-05-01'), durationMinutes: 30 },
    { type: ActivityType.PHONE_CALL, subject: 'Qualification call — Beta Logistics', customerId: betaId, contactId: charlieId, createdById: salesrepId, scheduledAt: new Date('2026-05-03'), durationMinutes: 45 },
    { type: ActivityType.PHONE_CALL, subject: 'Intro call — Gamma Healthcare', customerId: gammaId, contactId: eveId, createdById: salesrepId, scheduledAt: new Date('2026-05-05'), durationMinutes: 60 },
    { type: ActivityType.MEETING, subject: 'Acme requirements workshop', customerId: acmeId, contactId: aliceId, createdById: salesrepId, scheduledAt: new Date('2026-05-10'), durationMinutes: 120 },
    { type: ActivityType.MEETING, subject: 'Delta demo session', customerId: deltaId, createdById: salesrepId, scheduledAt: new Date('2026-05-12'), durationMinutes: 90 },
    { type: ActivityType.MEETING, subject: 'Epsilon product walkthrough', customerId: epsilonId, createdById: salesrep2Id, scheduledAt: new Date('2026-05-14'), durationMinutes: 60 },
    { type: ActivityType.EMAIL, subject: 'Sent proposal to Gamma', customerId: gammaId, contactId: eveId, createdById: salesrepId },
    { type: ActivityType.EMAIL, subject: 'Followed up on Theta contract', customerId: thetaId, createdById: supportId },
    { type: ActivityType.EMAIL, subject: 'Sent intro email — Iota', customerId: iotaId, createdById: supportId },
    { type: ActivityType.NOTE, subject: 'Acme: decision maker is CTO', customerId: acmeId, createdById: salesrepId },
    { type: ActivityType.NOTE, subject: 'Mu Technology: evaluating 3 vendors', customerId: muId, createdById: salesrep2Id },
    { type: ActivityType.NOTE, subject: 'Beta prefers phased rollout', customerId: betaId, createdById: salesrepId },
    { type: ActivityType.FOLLOW_UP, subject: 'Follow up on Gamma proposal next week', customerId: gammaId, contactId: eveId, createdById: salesrepId },
    { type: ActivityType.FOLLOW_UP, subject: 'Delta requested updated pricing', customerId: deltaId, createdById: salesrepId },
    { type: ActivityType.FOLLOW_UP, subject: 'Epsilon asked for reference customers', customerId: epsilonId, createdById: salesrep2Id },
  ];

  let activitiesSeeded = 0;
  for (const def of activityDefs) {
    const existing = await prisma.activity.findFirst({
      where: { subject: def.subject, customerId: def.customerId, type: def.type },
    });
    if (!existing) {
      await prisma.activity.create({ data: def });
      activitiesSeeded++;
    }
  }
  console.log(`Seeded ${activitiesSeeded} activities (${activityDefs.length} total)`);

  // ── Phase 6 T012: Tasks ────────────────────────────────────────────────────
  const acmeErpOppId = oppMap.get('Acme ERP Upgrade')!;
  const epsilonOppId = oppMap.get('Epsilon POS System')!;
  const overdueDate = new Date('2025-01-15');

  const taskDefs = [
    { type: TaskType.FOLLOW_UP, title: 'Follow up on Acme ERP proposal', status: TaskStatus.OPEN, dueDate: future(7), assigneeId: salesrepId, createdById: adminId, customerId: acmeId, opportunityId: acmeErpOppId },
    { type: TaskType.CALL, title: 'Call Beta re: delivery timeline', status: TaskStatus.OPEN, dueDate: future(14), assigneeId: salesrepId, createdById: adminId, customerId: betaId },
    { type: TaskType.MEETING, title: 'Schedule Gamma demo', status: TaskStatus.OPEN, dueDate: future(10), assigneeId: salesrep2Id, createdById: adminId, customerId: gammaId },
    { type: TaskType.EMAIL, title: 'Send Delta contract draft', status: TaskStatus.OPEN, dueDate: future(5), assigneeId: salesrep2Id, createdById: adminId, customerId: deltaId },
    { type: TaskType.INTERNAL_ACTION, title: 'Update Epsilon quote', status: TaskStatus.OPEN, dueDate: future(3), assigneeId: salesrep2Id, createdById: adminId, customerId: epsilonId, opportunityId: epsilonOppId },
    { type: TaskType.FOLLOW_UP, title: 'Follow up on Zeta requirements', status: TaskStatus.OPEN, dueDate: future(7), assigneeId: salesrepId, createdById: adminId, customerId: zetaId },
    { type: TaskType.CALL, title: 'Overdue: Confirm Eta kick-off', status: TaskStatus.OPEN, dueDate: overdueDate, assigneeId: salesrepId, createdById: adminId, customerId: etaId },
    { type: TaskType.EMAIL, title: 'Overdue: Send Theta summary', status: TaskStatus.OPEN, dueDate: overdueDate, assigneeId: supportId, createdById: adminId, customerId: thetaId },
    { type: TaskType.MEETING, title: 'Quarterly review prep', status: TaskStatus.COMPLETED, dueDate: past(30), assigneeId: managerId, createdById: adminId, completedAt: new Date('2026-05-20') },
    { type: TaskType.FOLLOW_UP, title: 'Check Mu contract', status: TaskStatus.OPEN, dueDate: future(21), assigneeId: salesrep2Id, createdById: adminId, customerId: muId },
    { type: TaskType.CALL, title: 'Introduction call — Kappa', status: TaskStatus.CANCELLED, dueDate: past(60), assigneeId: salesrepId, createdById: adminId, customerId: kappaId, cancelledAt: new Date('2026-04-01') },
    { type: TaskType.INTERNAL_ACTION, title: 'Update CRM pipeline report', status: TaskStatus.OPEN, dueDate: future(30), assigneeId: managerId, createdById: adminId },
  ];

  let tasksSeeded = 0;
  const taskMap = new Map<string, string>(); // title → id
  for (const def of taskDefs) {
    let task = await prisma.task.findFirst({ where: { title: def.title, assigneeId: def.assigneeId } });
    if (!task) {
      task = await prisma.task.create({ data: def });
      tasksSeeded++;
    }
    taskMap.set(def.title, task.id);
  }
  console.log(`Seeded ${tasksSeeded} tasks (${taskDefs.length} total)`);

  // ── Phase 7 T013: Audit Logs ───────────────────────────────────────────────
  const auditDefs = [
    { action: AuditAction.LOGIN, actorId: adminId, resourceType: 'User', resourceId: adminId, ipAddress: '127.0.0.1', createdAt: new Date('2026-06-01T09:00:00Z') },
    { action: AuditAction.LOGIN, actorId: managerId, resourceType: 'User', resourceId: managerId, ipAddress: '127.0.0.1', createdAt: new Date('2026-06-01T09:05:00Z') },
    { action: AuditAction.LOGIN, actorId: salesrepId, resourceType: 'User', resourceId: salesrepId, ipAddress: '127.0.0.1', createdAt: new Date('2026-06-01T09:10:00Z') },
    { action: AuditAction.RECORD_CREATED, actorId: salesrepId, resourceType: 'Customer', resourceId: acmeId, newValue: { companyName: 'Acme Corporation', status: 'PROSPECT' }, createdAt: new Date('2026-05-01T10:00:00Z') },
    { action: AuditAction.RECORD_CREATED, actorId: salesrep2Id, resourceType: 'Customer', resourceId: epsilonId, newValue: { companyName: 'Epsilon Retail', status: 'PROSPECT' }, createdAt: new Date('2026-05-02T10:00:00Z') },
    { action: AuditAction.RECORD_CREATED, actorId: salesrepId, resourceType: 'Opportunity', resourceId: oppMap.get('Acme ERP Upgrade'), newValue: { name: 'Acme ERP Upgrade', stage: 'Lead' }, createdAt: new Date('2026-05-05T11:00:00Z') },
    { action: AuditAction.RECORD_UPDATED, actorId: salesrepId, resourceType: 'Customer', resourceId: acmeId, previousValue: { status: 'PROSPECT' }, newValue: { status: 'ACTIVE' }, createdAt: new Date('2026-05-10T14:00:00Z') },
    { action: AuditAction.STATUS_CHANGED, actorId: adminId, resourceType: 'Customer', resourceId: kappaId, previousValue: { status: 'INACTIVE' }, newValue: { status: 'ARCHIVED' }, createdAt: new Date('2026-04-01T09:00:00Z') },
    { action: AuditAction.STATUS_CHANGED, actorId: salesrepId, resourceType: 'Opportunity', resourceId: oppMap.get('Acme Cloud Migration'), previousValue: { stage: 'Negotiation' }, newValue: { stage: 'Won' }, createdAt: new Date('2026-03-01T16:00:00Z') },
    { action: AuditAction.RECORD_CREATED, actorId: salesrepId, resourceType: 'Contact', resourceId: aliceId, newValue: { firstName: 'Alice', lastName: 'Acme' }, createdAt: new Date('2026-05-01T10:30:00Z') },
    { action: AuditAction.RECORD_UPDATED, actorId: salesrep2Id, resourceType: 'Opportunity', resourceId: oppMap.get('Epsilon POS System'), previousValue: { probability: 50 }, newValue: { probability: 60 }, createdAt: new Date('2026-05-15T13:00:00Z') },
    { action: AuditAction.STATUS_CHANGED, actorId: supportId, resourceType: 'Opportunity', resourceId: oppMap.get('Iota CMS Renewal'), previousValue: { stage: 'Negotiation' }, newValue: { stage: 'Lost' }, createdAt: new Date('2026-02-01T11:00:00Z') },
  ];

  let auditSeeded = 0;
  for (const def of auditDefs) {
    const count = await prisma.auditLog.count({
      where: { action: def.action, resourceType: def.resourceType, actorId: def.actorId },
    });
    if (count === 0) {
      await prisma.auditLog.create({ data: def });
      auditSeeded++;
    }
  }
  console.log(`Seeded ${auditSeeded} audit log entries (${auditDefs.length} total)`);

  // ── Phase 7 T014: Notifications ────────────────────────────────────────────
  const followUpTaskId = taskMap.get('Follow up on Acme ERP proposal')!;
  const callBetaTaskId = taskMap.get('Call Beta re: delivery timeline')!;
  const scheduleGammaTaskId = taskMap.get('Schedule Gamma demo')!;
  const updateEpsilonTaskId = taskMap.get('Update Epsilon quote')!;
  const overduteThetaTaskId = taskMap.get('Overdue: Send Theta summary')!;
  const quarterlyReviewTaskId = taskMap.get('Quarterly review prep')!;
  const pipelineReportTaskId = taskMap.get('Update CRM pipeline report')!;
  const followUpZetaTaskId = taskMap.get('Follow up on Zeta requirements')!;
  const checkMuTaskId = taskMap.get('Check Mu contract')!;

  const notifDefs = [
    // salesrep
    { userId: salesrepId, type: NotificationType.TASK_ASSIGNED, title: 'New task assigned: Follow up on Acme ERP proposal', body: 'You have been assigned a new follow-up task for Acme Corporation.', resourceType: 'Task', resourceId: followUpTaskId },
    { userId: salesrepId, type: NotificationType.OPPORTUNITY_ASSIGNED, title: 'Opportunity assigned: Acme ERP Upgrade', body: 'You have been assigned the Acme ERP Upgrade opportunity.', resourceType: 'Opportunity', resourceId: oppMap.get('Acme ERP Upgrade') },
    { userId: salesrepId, type: NotificationType.DUE_DATE_REMINDER, title: 'Task due soon: Call Beta re: delivery timeline', body: 'This task is due in 14 days.', resourceType: 'Task', resourceId: callBetaTaskId },
    // salesrep2
    { userId: salesrep2Id, type: NotificationType.TASK_ASSIGNED, title: 'New task assigned: Schedule Gamma demo', body: 'You have been assigned a new meeting task for Gamma Healthcare.', resourceType: 'Task', resourceId: scheduleGammaTaskId },
    { userId: salesrep2Id, type: NotificationType.OPPORTUNITY_ASSIGNED, title: 'Opportunity assigned: Epsilon POS System', body: 'You have been assigned the Epsilon POS System opportunity.', resourceType: 'Opportunity', resourceId: oppMap.get('Epsilon POS System') },
    { userId: salesrep2Id, type: NotificationType.DUE_DATE_REMINDER, title: 'Task due soon: Update Epsilon quote', body: 'This task is due in 3 days.', resourceType: 'Task', resourceId: updateEpsilonTaskId },
    // manager
    { userId: managerId, type: NotificationType.TASK_ASSIGNED, title: 'New task: Quarterly review prep', body: 'You have been assigned the quarterly review preparation task.', resourceType: 'Task', resourceId: quarterlyReviewTaskId },
    { userId: managerId, type: NotificationType.OPPORTUNITY_ASSIGNED, title: 'Team opportunity: Theta SCADA Upgrade', body: 'A new opportunity has been added to your team pipeline.', resourceType: 'Opportunity', resourceId: oppMap.get('Theta SCADA Upgrade') },
    { userId: managerId, type: NotificationType.DUE_DATE_REMINDER, title: 'Task due soon: Update CRM pipeline report', body: 'This task is due in 30 days.', resourceType: 'Task', resourceId: pipelineReportTaskId },
    // support
    { userId: supportId, type: NotificationType.TASK_ASSIGNED, title: 'New task: Overdue: Send Theta summary', body: 'You have an overdue task requiring attention.', resourceType: 'Task', resourceId: overduteThetaTaskId },
    { userId: supportId, type: NotificationType.OPPORTUNITY_ASSIGNED, title: 'Opportunity assigned: Gamma EMR Platform', body: 'You have been added to the Gamma EMR Platform opportunity.', resourceType: 'Opportunity', resourceId: oppMap.get('Gamma EMR Platform') },
    { userId: supportId, type: NotificationType.DUE_DATE_REMINDER, title: 'Overdue task: Send Theta summary', body: 'This task was due on 2025-01-15 and is overdue.', resourceType: 'Task', resourceId: overduteThetaTaskId },
    // admin
    { userId: adminId, type: NotificationType.TASK_ASSIGNED, title: 'Team task: Update CRM pipeline report', body: 'A new pipeline report task has been created.', resourceType: 'Task', resourceId: pipelineReportTaskId },
    { userId: adminId, type: NotificationType.OPPORTUNITY_ASSIGNED, title: 'New opportunity in pipeline: Beta Fleet Mgmt', body: 'A new opportunity has entered the pipeline.', resourceType: 'Opportunity', resourceId: oppMap.get('Beta Fleet Mgmt') },
    { userId: adminId, type: NotificationType.DUE_DATE_REMINDER, title: 'Pipeline reminder: Eta LMS Platform negotiation', body: 'The Eta LMS Platform opportunity is in Negotiation stage.', resourceType: 'Opportunity', resourceId: oppMap.get('Eta LMS Platform') },
    // readonly
    { userId: readonlyId, type: NotificationType.TASK_ASSIGNED, title: 'Read-only feed: Follow up on Zeta requirements', body: 'A task has been assigned in your visibility scope.', resourceType: 'Task', resourceId: followUpZetaTaskId },
    { userId: readonlyId, type: NotificationType.OPPORTUNITY_ASSIGNED, title: 'Pipeline update: Zeta Automation Suite', body: 'An opportunity has been updated in the pipeline.', resourceType: 'Opportunity', resourceId: oppMap.get('Zeta Automation Suite') },
    { userId: readonlyId, type: NotificationType.DUE_DATE_REMINDER, title: 'Reminder: Check Mu contract', body: 'A task deadline is approaching.', resourceType: 'Task', resourceId: checkMuTaskId },
  ];

  let notifsSeeded = 0;
  for (const def of notifDefs) {
    const existing = await prisma.notification.findFirst({
      where: { userId: def.userId, type: def.type, title: def.title },
    });
    if (!existing) {
      await prisma.notification.create({ data: def });
      notifsSeeded++;
    }
  }
  console.log(`Seeded ${notifsSeeded} notifications (${notifDefs.length} total)`);

  // ── Phase 9: Won Opportunities — Current Month (T002) ─────────────────────
  const wonCurrentMonthDefs = [
    { name: 'Acme Security Suite — Won', customerId: acmeId, ownerId: salesrepId, stageId: wonId, expectedRevenue: 65000, probability: 100, actualCloseDate: monthMid(0) },
    { name: 'Delta Analytics Contract — Won', customerId: deltaId, ownerId: salesrep2Id, stageId: wonId, expectedRevenue: 120000, probability: 100, actualCloseDate: monthMid(0) },
  ];
  let wonCurrentSeeded = 0;
  for (const def of wonCurrentMonthDefs) {
    const existing = await prisma.opportunity.findFirst({ where: { name: def.name } });
    if (!existing) {
      await prisma.opportunity.create({ data: def });
      wonCurrentSeeded++;
    }
  }
  console.log(`Seeded ${wonCurrentSeeded} won opportunities for current month (${wonCurrentMonthDefs.length} total)`);

  // ── Phase 10: Expected Close Dates on Open Opportunities (T003) ────────────
  const openOppForecastUpdates = [
    { name: 'Gamma EMR Platform', expectedCloseDate: monthMid(-1) },
    { name: 'Delta Risk Analytics', expectedCloseDate: monthMid(-2) },
    { name: 'Zeta Automation Suite', expectedCloseDate: monthMid(-3) },
    { name: 'Theta SCADA Upgrade', expectedCloseDate: monthMid(-4) },
  ];
  let forecastUpdated = 0;
  for (const upd of openOppForecastUpdates) {
    const opp = await prisma.opportunity.findFirst({ where: { name: upd.name } });
    if (opp && !opp.expectedCloseDate) {
      await prisma.opportunity.update({ where: { id: opp.id }, data: { expectedCloseDate: upd.expectedCloseDate } });
      forecastUpdated++;
    }
  }
  console.log(`Updated ${forecastUpdated} open opportunities with expectedCloseDate`);

  // ── Phase 11: Relative-Date Activities — 30-Day Window (T004) ─────────────
  const relActivityTypes: ActivityType[] = [
    ActivityType.PHONE_CALL,
    ActivityType.MEETING,
    ActivityType.EMAIL,
    ActivityType.NOTE,
    ActivityType.FOLLOW_UP,
  ];
  const relActivityTypeLabels: Record<ActivityType, string> = {
    [ActivityType.PHONE_CALL]: 'Phone Call',
    [ActivityType.MEETING]: 'Meeting',
    [ActivityType.EMAIL]: 'Email',
    [ActivityType.NOTE]: 'Note',
    [ActivityType.FOLLOW_UP]: 'Follow Up',
  };
  const relActivityCustomers = [acmeId, betaId, gammaId];
  const relActivityUsers = [salesrepId, salesrep2Id, supportId];

  let relActivitiesSeeded = 0;
  for (let i = 0; i < 30; i++) {
    const type = relActivityTypes[i % 5];
    const customerId = relActivityCustomers[i % 3];
    const createdById = relActivityUsers[i % 3];
    const scheduledAt = past(i);
    const subject = `${relActivityTypeLabels[type]} — Day ${30 - i}`;

    const existing = await prisma.activity.findFirst({ where: { subject, customerId, type } });
    if (!existing) {
      await prisma.activity.create({ data: { type, subject, customerId, createdById, scheduledAt } });
      relActivitiesSeeded++;
    }
  }
  console.log(`Seeded ${relActivitiesSeeded} relative-date activities (30 total)`);

  // ── Phase 12: Historical Won Opportunities — Months 5, 4, 1 Ago (T005) ────
  const wonHistoricalDefs = [
    { name: 'Beta Cloud Services — Jan Won', customerId: betaId, ownerId: salesrepId, stageId: wonId, expectedRevenue: 55000, probability: 100, actualCloseDate: monthMid(5) },
    { name: 'Epsilon Digital Upgrade — Feb Won', customerId: epsilonId, ownerId: salesrep2Id, stageId: wonId, expectedRevenue: 28000, probability: 100, actualCloseDate: monthMid(4) },
    { name: 'Gamma Telehealth Platform — May Won', customerId: gammaId, ownerId: salesrepId, stageId: wonId, expectedRevenue: 175000, probability: 100, actualCloseDate: monthMid(1) },
  ];
  let wonHistoricalSeeded = 0;
  for (const def of wonHistoricalDefs) {
    const existing = await prisma.opportunity.findFirst({ where: { name: def.name } });
    if (!existing) {
      await prisma.opportunity.create({ data: def });
      wonHistoricalSeeded++;
    }
  }
  console.log(`Seeded ${wonHistoricalSeeded} historical won opportunities (${wonHistoricalDefs.length} total)`);

  // ── Phase 13: Completed Tasks — This Month (T006) ─────────────────────────
  const completedTaskDefs = [
    { type: TaskType.FOLLOW_UP, title: 'Completed: Sent Acme Q2 summary', status: TaskStatus.COMPLETED, dueDate: monthStart(0), completedAt: monthStart(0), assigneeId: salesrepId, createdById: adminId, customerId: acmeId },
    { type: TaskType.CALL, title: 'Completed: Confirmed Beta onboarding date', status: TaskStatus.COMPLETED, dueDate: monthStart(0), completedAt: new Date(monthStart(0).getTime() + 86400000), assigneeId: salesrepId, createdById: adminId, customerId: betaId },
    { type: TaskType.EMAIL, title: 'Completed: Sent Gamma renewal proposal', status: TaskStatus.COMPLETED, dueDate: monthStart(0), completedAt: new Date(monthStart(0).getTime() + 2 * 86400000), assigneeId: salesrep2Id, createdById: adminId, customerId: gammaId },
    { type: TaskType.MEETING, title: 'Completed: Delta executive check-in', status: TaskStatus.COMPLETED, dueDate: monthStart(0), completedAt: new Date(monthStart(0).getTime() + 3 * 86400000), assigneeId: salesrep2Id, createdById: adminId, customerId: deltaId },
  ];
  let completedTasksSeeded = 0;
  for (const def of completedTaskDefs) {
    const existing = await prisma.task.findFirst({ where: { title: def.title } });
    if (!existing) {
      await prisma.task.create({ data: def });
      completedTasksSeeded++;
    }
  }
  console.log(`Seeded ${completedTasksSeeded} completed tasks for current month (${completedTaskDefs.length} total)`);

  // ── Phase 8 T015: Summary ──────────────────────────────────────────────────
  console.log('\nSeed completed successfully.\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
