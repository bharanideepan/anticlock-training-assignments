import { z } from 'zod';

export const TASK_TYPES = ['FOLLOW_UP', 'CALL', 'MEETING', 'EMAIL', 'INTERNAL_ACTION'] as const;
export const TASK_STATUSES = ['OPEN', 'COMPLETED', 'CANCELLED'] as const;

export const createTaskSchema = z.object({
  type: z.enum(TASK_TYPES, { required_error: 'Task type is required' }),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  assigneeId: z.string().uuid('Invalid assignee').optional().or(z.literal('')),
  customerId: z.string().uuid('Invalid customer').optional().or(z.literal('')),
  opportunityId: z.string().uuid('Invalid opportunity').optional().or(z.literal('')),
});

export const updateTaskSchema = z.object({
  type: z.enum(TASK_TYPES).optional(),
  title: z.string().min(1, 'Title is required').max(500).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().uuid('Invalid assignee').optional().or(z.literal('')),
  opportunityId: z.string().uuid('Invalid opportunity').optional().or(z.literal('')),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
