import { z } from 'zod';

export const createOpportunitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(500),
  customerId: z.string().uuid('Customer is required'),
  contactId: z.string().uuid('Invalid contact').optional().or(z.literal('')),
  ownerId: z.string().uuid('Invalid owner').optional().or(z.literal('')),
  expectedRevenue: z.preprocess(
    (v) => (v === '' || Number.isNaN(v as number) ? undefined : v),
    z.number().min(0).optional(),
  ),
  probability: z.preprocess(
    (v) => (v === '' || Number.isNaN(v as number) ? undefined : v),
    z.number().int().min(0).max(100).optional(),
  ),
  expectedCloseDate: z.string().optional(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial().omit({ customerId: true });

export type CreateOpportunityFormValues = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityFormValues = z.infer<typeof updateOpportunitySchema>;
