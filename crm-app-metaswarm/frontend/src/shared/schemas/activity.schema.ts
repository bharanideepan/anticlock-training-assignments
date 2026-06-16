import { z } from 'zod';

const ACTIVITY_TYPES = ['PHONE_CALL', 'MEETING', 'EMAIL', 'NOTE', 'FOLLOW_UP'] as const;

export const createActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES, { required_error: 'Activity type is required' }),
  subject: z.string().min(1, 'Subject is required').max(500),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.preprocess((v) => (Number.isNaN(v as number) ? undefined : v), z.number().int().min(1).optional()),
  customerId: z.string().uuid('Customer is required'),
  contactId: z.string().uuid('Invalid contact').optional().or(z.literal('')),
});

export const updateActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES).optional(),
  subject: z.string().min(1, 'Subject is required').max(500).optional(),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.preprocess((v) => (Number.isNaN(v as number) ? undefined : v), z.number().int().min(1).optional()),
  contactId: z.string().uuid('Invalid contact').optional().or(z.literal('')),
});

export type CreateActivityFormValues = z.infer<typeof createActivitySchema>;
export type UpdateActivityFormValues = z.infer<typeof updateActivitySchema>;
