import { z } from 'zod';

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  designation: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
  notes: z.string().optional(),
  customerId: z.string().uuid('Customer is required'),
});

export const updateContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100).optional(),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  designation: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
  notes: z.string().optional(),
});

export type CreateContactFormValues = z.infer<typeof createContactSchema>;
export type UpdateContactFormValues = z.infer<typeof updateContactSchema>;
