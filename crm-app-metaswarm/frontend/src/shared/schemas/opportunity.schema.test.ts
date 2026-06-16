import { createOpportunitySchema, updateOpportunitySchema } from './opportunity.schema';

describe('createOpportunitySchema', () => {
  it('accepts valid opportunity', () => {
    const result = createOpportunitySchema.safeParse({
      name: 'Big Deal',
      customerId: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createOpportunitySchema.safeParse({
      customerId: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid customerId', () => {
    const result = createOpportunitySchema.safeParse({ name: 'X', customerId: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = createOpportunitySchema.safeParse({
      name: 'Deal', customerId: '00000000-0000-0000-0000-000000000001',
      expectedRevenue: 50000, probability: 75,
    });
    expect(result.success).toBe(true);
  });

  it('treats NaN expectedRevenue as undefined', () => {
    const result = createOpportunitySchema.safeParse({
      name: 'Deal', customerId: '00000000-0000-0000-0000-000000000001',
      expectedRevenue: NaN,
    });
    expect(result.success).toBe(true);
  });
});

describe('updateOpportunitySchema', () => {
  it('accepts empty update', () => {
    expect(updateOpportunitySchema.safeParse({}).success).toBe(true);
  });

  it('rejects empty name when provided', () => {
    expect(updateOpportunitySchema.safeParse({ name: '' }).success).toBe(false);
  });
});
