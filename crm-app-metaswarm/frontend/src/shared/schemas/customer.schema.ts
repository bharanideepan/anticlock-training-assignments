import { z } from 'zod';

const revenueRangeValues = [
  'UNDER_1M',
  'ONE_M_10M',
  'TEN_M_50M',
  'FIFTY_M_250M',
  'OVER_250M',
] as const;

export const createCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(255),
  industry: z.string().max(100).optional(),
  website: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
  revenueRange: z.enum(revenueRangeValues).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  ownerId: z.string().uuid().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['PROSPECT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']),
  reason: z.string().max(500).optional(),
});

export type CreateCustomerFormValues = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerFormValues = z.infer<typeof updateCustomerSchema>;
export type UpdateStatusFormValues = z.infer<typeof updateStatusSchema>;
