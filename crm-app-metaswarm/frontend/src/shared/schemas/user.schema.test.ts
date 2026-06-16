import { describe, it, expect } from 'vitest';
import { createUserSchema, updateUserSchema, createTeamSchema, updateTeamSchema } from './user.schema';

describe('createUserSchema', () => {
  it('accepts valid input', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      roleId: 'r1',
      teamIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('fails when firstName is empty', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      firstName: '',
      lastName: 'Doe',
      roleId: 'r1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('First name is required');
    }
  });

  it('fails when email is invalid', () => {
    const result = createUserSchema.safeParse({
      email: 'not-an-email',
      firstName: 'Jane',
      lastName: 'Doe',
      roleId: 'r1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty teamIds array', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      roleId: 'r1',
      teamIds: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.teamIds).toEqual([]);
    }
  });
});

describe('updateUserSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial updates', () => {
    const result = updateUserSchema.safeParse({ firstName: 'Janet' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Janet');
    }
  });
});

describe('createTeamSchema', () => {
  it('accepts valid input', () => {
    const result = createTeamSchema.safeParse({ name: 'East Sales' });
    expect(result.success).toBe(true);
  });

  it('fails when name is empty', () => {
    const result = createTeamSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Team name is required');
    }
  });
});

describe('updateTeamSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateTeamSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('fails when name is empty string', () => {
    const result = updateTeamSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
