import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack,
} from '@mui/material';
import { useCreateTask, useUpdateTask, type CreateTaskPayload, type TaskType } from '../../api/tasks.api';
import type { Task } from '../../shared/types/api.types';
import { apiClient } from '../../api/client';
import AsyncAutocomplete from '../../shared/components/AsyncAutocomplete';

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'CALL', label: 'Call' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'INTERNAL_ACTION', label: 'Internal Action' },
];

async function fetchUserOptions(search: string, page: number) {
  const { data } = await apiClient.get<{
    data: { id: string; firstName: string; lastName: string; email: string }[];
    meta: { totalPages: number };
  }>('/users', { params: { search, page, pageSize: 10 } });
  return {
    items: data.data.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName}`, subtitle: u.email })),
    hasMore: page < data.meta.totalPages,
  };
}

async function fetchCustomerOptions(search: string, page: number) {
  const { data } = await apiClient.get<{
    data: { id: string; companyName: string; status: string }[];
    meta: { totalPages: number };
  }>('/customers', { params: { search, page, pageSize: 10 } });
  return {
    items: data.data.map((c) => ({ id: c.id, label: c.companyName, subtitle: c.status })),
    hasMore: page < data.meta.totalPages,
  };
}

const schema = z.object({
  type: z.enum(['FOLLOW_UP', 'CALL', 'MEETING', 'EMAIL', 'INTERNAL_ACTION']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  customerId: z.string().optional(),
  opportunityId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  customerId?: string;
  opportunityId?: string;
  onSuccess?: (task: Task) => void;
}

export default function TaskFormDialog({
  open, onClose, task, customerId: presetCustomerId, opportunityId: presetOpportunityId, onSuccess,
}: TaskFormDialogProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'FOLLOW_UP',
      title: '',
      description: '',
      dueDate: '',
      assigneeId: '',
      customerId: presetCustomerId ?? '',
      opportunityId: presetOpportunityId ?? '',
    },
  });

  useEffect(() => {
    if (task) {
      reset({
        type: task.type,
        title: task.title,
        description: task.description ?? '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '',
        assigneeId: task.assignee?.id ?? '',
        customerId: task.customerId ?? '',
        opportunityId: task.opportunityId ?? '',
      });
    } else {
      reset({
        type: 'FOLLOW_UP',
        title: '',
        description: '',
        dueDate: '',
        assigneeId: '',
        customerId: presetCustomerId ?? '',
        opportunityId: presetOpportunityId ?? '',
      });
    }
  }, [task, presetCustomerId, presetOpportunityId, reset, open]);

  const onSubmit = async (values: FormValues) => {
    const payload: CreateTaskPayload = {
      type: values.type,
      title: values.title,
      description: values.description || undefined,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      assigneeId: values.assigneeId || undefined,
      customerId: values.customerId || undefined,
      opportunityId: values.opportunityId || undefined,
    };

    if (task) {
      const updated = await updateTask.mutateAsync({ id: task.id, payload });
      onSuccess?.(updated);
    } else {
      const created = await createTask.mutateAsync(payload);
      onSuccess?.(created);
    }
    onClose();
  };

  const isLoading = createTask.isPending || updateTask.isPending;

  const assigneeLabel = task?.assignee
    ? `${task.assignee.firstName} ${task.assignee.lastName}`
    : undefined;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField select label="Type" {...field} error={!!errors.type} helperText={errors.type?.message} fullWidth size="small">
                  {TASK_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
              )}
            />
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField label="Title" {...field} error={!!errors.title} helperText={errors.title?.message} fullWidth size="small" />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField label="Description" {...field} multiline rows={3} fullWidth />
              )}
            />
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <TextField type="datetime-local" label="Due Date" {...field} slotProps={{ inputLabel: { shrink: true } }} fullWidth size="small" />
              )}
            />
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <AsyncAutocomplete
                  label="Assignee"
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? '')}
                  fetchOptions={fetchUserOptions}
                  initialLabel={assigneeLabel}
                  placeholder="Search users…"
                />
              )}
            />
            {!presetCustomerId && (
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <AsyncAutocomplete
                    label="Customer (optional)"
                    value={field.value || null}
                    onChange={(id) => field.onChange(id ?? '')}
                    fetchOptions={fetchCustomerOptions}
                    placeholder="Search customers…"
                  />
                )}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {task ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
