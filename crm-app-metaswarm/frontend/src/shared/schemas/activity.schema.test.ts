import { createActivitySchema, updateActivitySchema } from './activity.schema';

describe('createActivitySchema', () => {
  it('accepts valid activity', () => {
    const result = createActivitySchema.safeParse({
      type: 'PHONE_CALL',
      subject: 'Initial call',
      customerId: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing type', () => {
    const result = createActivitySchema.safeParse({
      subject: 'Call', customerId: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing subject', () => {
    const result = createActivitySchema.safeParse({
      type: 'MEETING', customerId: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid customerId', () => {
    const result = createActivitySchema.safeParse({
      type: 'NOTE', subject: 'Test', customerId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = createActivitySchema.safeParse({
      type: 'MEETING',
      subject: 'Sync',
      customerId: '00000000-0000-0000-0000-000000000001',
      description: 'Weekly sync',
      durationMinutes: 60,
    });
    expect(result.success).toBe(true);
  });
});

describe('updateActivitySchema', () => {
  it('accepts empty update', () => {
    const result = updateActivitySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateActivitySchema.safeParse({ subject: 'Updated', durationMinutes: 30 });
    expect(result.success).toBe(true);
  });

  it('rejects empty subject when provided', () => {
    const result = updateActivitySchema.safeParse({ subject: '' });
    expect(result.success).toBe(false);
  });
});
