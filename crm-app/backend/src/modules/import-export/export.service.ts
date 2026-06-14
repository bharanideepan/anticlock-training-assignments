import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleName } from '@prisma/client';

interface RequestUser {
  id: string;
  role: RoleName;
  teamId?: string;
}

function toCsvLine(values: (string | undefined | null)[]): string {
  return values.map((v) => `"${(v ?? '').replace(/"/g, '""')}"`).join(',');
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportCustomers(user: RequestUser): Promise<string> {
    const where: any = { deletedAt: null };
    if (
      user.role !== RoleName.SYSTEM_ADMINISTRATOR &&
      user.role !== RoleName.SALES_MANAGER
    ) {
      where.ownerId = user.id;
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        owner: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { companyName: 'asc' },
    });

    const headers = [
      'id',
      'companyName',
      'industry',
      'website',
      'revenueRange',
      'addressLine1',
      'city',
      'state',
      'country',
      'postalCode',
      'status',
      'ownerEmail',
      'createdAt',
    ];

    const lines = [
      headers.join(','),
      ...customers.map((c) =>
        toCsvLine([
          c.id,
          c.companyName,
          c.industry,
          c.website,
          c.revenueRange,
          c.addressLine1,
          c.city,
          c.state,
          c.country,
          c.postalCode,
          c.status,
          c.owner.email,
          c.createdAt.toISOString(),
        ]),
      ),
    ];

    return lines.join('\n');
  }

  async exportContacts(user: RequestUser): Promise<string> {
    const where: any = { deletedAt: null };
    if (
      user.role !== RoleName.SYSTEM_ADMINISTRATOR &&
      user.role !== RoleName.SALES_MANAGER
    ) {
      where.customer = { ownerId: user.id };
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      include: { customer: { select: { companyName: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const headers = [
      'id',
      'firstName',
      'lastName',
      'email',
      'phone',
      'designation',
      'department',
      'notes',
      'customerCompanyName',
      'createdAt',
    ];

    const lines = [
      headers.join(','),
      ...contacts.map((c) =>
        toCsvLine([
          c.id,
          c.firstName,
          c.lastName,
          c.email,
          c.phone,
          c.designation,
          c.department,
          c.notes,
          c.customer.companyName,
          c.createdAt.toISOString(),
        ]),
      ),
    ];

    return lines.join('\n');
  }
}
