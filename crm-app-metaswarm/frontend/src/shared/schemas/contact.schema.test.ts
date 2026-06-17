import { describe, it, expect } from 'vitest';
import { createContactSchema, updateContactSchema } from './contact.schema';

describe('createContactSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createContactSchema.safeParse({
      firstName: 'Sarah', lastName: 'Lee', customerId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing firstName', () => {
    const result = createContactSchema.safeParse({
      lastName: 'Lee', customerId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing lastName', () => {
    const result = createContactSchema.safeParse({
      firstName: 'Sarah', customerId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = createContactSchema.safeParse({
      firstName: 'Sarah', lastName: 'Lee', email: 'not-email',
      customerId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty string for email (allows clearing)', () => {
    const result = createContactSchema.safeParse({
      firstName: 'Sarah', lastName: 'Lee', email: '',
      customerId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid customerId (not UUID)', () => {
    const result = createContactSchema.safeParse({
      firstName: 'Sarah', lastName: 'Lee', customerId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateContactSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(updateContactSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateContactSchema.safeParse({ designation: 'CTO', department: 'Engineering' });
    expect(result.success).toBe(true);
  });
});
