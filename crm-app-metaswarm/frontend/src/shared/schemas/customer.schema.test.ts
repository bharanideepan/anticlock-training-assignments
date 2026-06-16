import { describe, it, expect } from 'vitest';
import { createCustomerSchema, updateCustomerSchema, updateStatusSchema } from './customer.schema';

describe('createCustomerSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createCustomerSchema.safeParse({ companyName: 'Acme Corp' });
    expect(result.success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = createCustomerSchema.safeParse({
      companyName: 'Acme Corp',
      industry: 'Technology',
      website: 'https://acme.com',
      revenueRange: 'ONE_M_10M',
      city: 'Austin',
      state: 'TX',
      country: 'US',
      postalCode: '78701',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing companyName', () => {
    const result = createCustomerSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL for website', () => {
    const result = createCustomerSchema.safeParse({
      companyName: 'Acme',
      website: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid revenueRange', () => {
    const result = createCustomerSchema.safeParse({
      companyName: 'Acme',
      revenueRange: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty string for website (allows clearing)', () => {
    const result = createCustomerSchema.safeParse({
      companyName: 'Acme',
      website: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateCustomerSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateCustomerSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateCustomerSchema.safeParse({ companyName: 'Updated Corp', city: 'Dallas' });
    expect(result.success).toBe(true);
  });
});

describe('updateStatusSchema', () => {
  it('accepts valid status ACTIVE', () => {
    const result = updateStatusSchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
  });

  it('accepts status with optional reason', () => {
    const result = updateStatusSchema.safeParse({
      status: 'INACTIVE',
      reason: 'Customer churned',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateStatusSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects missing status', () => {
    const result = updateStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
