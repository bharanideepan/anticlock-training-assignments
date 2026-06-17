import { useEffect } from 'react';
import {
  Box, Button, CircularProgress, Grid, MenuItem, Paper, Select, TextField, Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { createTaskSchema, updateTaskSchema } from '../../shared/schemas/task.schema';
import type { CreateTaskInput, UpdateTaskInput } from '../../shared/schemas/task.schema';
import { useCreateTask, useUpdateTask, useTask } from '../../api/tasks';

const TASK_TYPES = [
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'CALL', label: 'Call' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'INTERNAL_ACTION', label: 'Internal Action' },
];

function CreateForm() {
  const navigate = useNavigate();
  const createMutation = useCreateTask();

  const { register, control, handleSubmit, formState: { errors } } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { type: 'FOLLOW_UP', title: '' },
  });

  const onSubmit = async (values: CreateTaskInput) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
    ) as Record<string, unknown>;
    const task = await createMutation.mutateAsync(data);
    navigate(`/tasks/${task.id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>Create Task</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select {...field} fullWidth displayEmpty>
                    {TASK_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Title *" fullWidth {...register('title')}
                error={!!errors.title} helperText={errors.title?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={3} {...register('description')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Due Date *" fullWidth type="date" InputLabelProps={{ shrink: true }}
                {...register('dueDate')} error={!!errors.dueDate} helperText={errors.dueDate?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Assignee ID" fullWidth {...register('assigneeId')}
                error={!!errors.assigneeId} helperText={errors.assigneeId?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Customer ID" fullWidth {...register('customerId')}
                error={!!errors.customerId} helperText={errors.customerId?.message} />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Task'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/tasks')}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

function EditForm({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(id);
  const updateMutation = useUpdateTask(id);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<UpdateTaskInput>({
    resolver: zodResolver(updateTaskSchema),
  });

  useEffect(() => {
    if (task) {
      reset({
        type: task.type,
        title: task.title,
        description: task.description ?? '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        assigneeId: task.assigneeId,
      });
    }
  }, [task, reset]);

  if (isLoading) return <CircularProgress />;
  if (!task) return null;

  const onSubmit = async (values: UpdateTaskInput) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    await updateMutation.mutateAsync(data);
    navigate(`/tasks/${id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>Edit Task</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select {...field} fullWidth displayEmpty>
                    {TASK_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Title *" fullWidth {...register('title')}
                error={!!errors.title} helperText={errors.title?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={3} {...register('description')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Due Date" fullWidth type="date" InputLabelProps={{ shrink: true }}
                {...register('dueDate')} error={!!errors.dueDate} helperText={errors.dueDate?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Assignee ID" fullWidth {...register('assigneeId')}
                error={!!errors.assigneeId} helperText={errors.assigneeId?.message} />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/tasks/${id}`)}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default function TaskFormPage() {
  const { id } = useParams<{ id?: string }>();
  return id ? <EditForm id={id} /> : <CreateForm />;
}
