import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerStatus, RevenueRange } from '@prisma/client';

interface CustomerRow {
  companyName: string;
  industry?: string;
  website?: string;
  revenueRange?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  status?: string;
}

interface ContactRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  notes?: string;
  customerCompanyName?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

function parseCsv(buffer: Buffer): Record<string, string>[] {
  const text = buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importCustomers(
    buffer: Buffer,
    actorId: string,
  ): Promise<ImportResult> {
    const rows = parseCsv(buffer);
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown as CustomerRow;
      if (!row.companyName) {
        result.errors.push(`Row ${i + 2}: companyName is required`);
        result.skipped++;
        continue;
      }

      const statusValue =
        row.status &&
        Object.values(CustomerStatus).includes(row.status as CustomerStatus)
          ? (row.status as CustomerStatus)
          : CustomerStatus.PROSPECT;

      const revenueRangeValue =
        row.revenueRange &&
        Object.values(RevenueRange).includes(row.revenueRange as RevenueRange)
          ? (row.revenueRange as RevenueRange)
          : undefined;

      try {
        await this.prisma.customer.create({
          data: {
            companyName: row.companyName,
            industry: row.industry || undefined,
            website: row.website || undefined,
            revenueRange: revenueRangeValue,
            addressLine1: row.addressLine1 || undefined,
            city: row.city || undefined,
            state: row.state || undefined,
            country: row.country || undefined,
            postalCode: row.postalCode || undefined,
            status: statusValue,
            ownerId: actorId,
          },
        });
        result.imported++;
      } catch {
        result.errors.push(`Row ${i + 2}: failed to create customer`);
        result.skipped++;
      }
    }

    return result;
  }

  async importContacts(
    buffer: Buffer,
    _actorId: string,
  ): Promise<ImportResult> {
    const rows = parseCsv(buffer);
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown as ContactRow;
      if (!row.firstName || !row.lastName) {
        result.errors.push(`Row ${i + 2}: firstName and lastName are required`);
        result.skipped++;
        continue;
      }

      let customerId: string | undefined;
      if (row.customerCompanyName) {
        const customer = await this.prisma.customer.findFirst({
          where: { companyName: row.customerCompanyName, deletedAt: null },
          select: { id: true },
        });
        if (!customer) {
          result.errors.push(
            `Row ${i + 2}: customer "${row.customerCompanyName}" not found`,
          );
          result.skipped++;
          continue;
        }
        customerId = customer.id;
      }

      if (!customerId) {
        result.errors.push(`Row ${i + 2}: customerCompanyName is required`);
        result.skipped++;
        continue;
      }

      try {
        await this.prisma.contact.create({
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email || undefined,
            phone: row.phone || undefined,
            designation: row.designation || undefined,
            department: row.department || undefined,
            notes: row.notes || undefined,
            customerId,
          },
        });
        result.imported++;
      } catch {
        result.errors.push(`Row ${i + 2}: failed to create contact`);
        result.skipped++;
      }
    }

    return result;
  }
}
