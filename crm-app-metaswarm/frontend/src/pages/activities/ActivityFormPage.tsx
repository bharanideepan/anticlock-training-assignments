import { useEffect } from 'react';
import {
  Box, Button, CircularProgress, Grid, MenuItem, Paper, Select, TextField, Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { createActivitySchema, updateActivitySchema } from '../../shared/schemas/activity.schema';
import type { CreateActivityFormValues, UpdateActivityFormValues } from '../../shared/schemas/activity.schema';
import { useCreateActivity, useUpdateActivity, useActivity } from '../../api/activities';

const ACTIVITY_TYPES = [
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'NOTE', label: 'Note' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
];

function CreateForm() {
  const navigate = useNavigate();
  const createMutation = useCreateActivity();
  const { customerId: prefilledCustomerId } = useParams<{ customerId?: string }>();

  const { register, control, handleSubmit, formState: { errors } } = useForm<CreateActivityFormValues>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: { type: 'PHONE_CALL', subject: '', customerId: prefilledCustomerId ?? '' },
  });

  const onSubmit = async (values: CreateActivityFormValues) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
    ) as Record<string, unknown>;
    const activity = await createMutation.mutateAsync(data);
    navigate(`/activities/${activity.id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>Create Activity</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select {...field} fullWidth displayEmpty>
                    {ACTIVITY_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Subject *" fullWidth {...register('subject')}
                error={!!errors.subject} helperText={errors.subject?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={3} {...register('description')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Customer ID *" fullWidth {...register('customerId')}
                error={!!errors.customerId} helperText={errors.customerId?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Scheduled At" fullWidth type="datetime-local" InputLabelProps={{ shrink: true }}
                {...register('scheduledAt')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Duration (min)" fullWidth type="number" {...register('durationMinutes', { valueAsNumber: true })} />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Activity'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/activities')}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

function EditForm({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: activity, isLoading } = useActivity(id);
  const updateMutation = useUpdateActivity(id);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<UpdateActivityFormValues>({
    resolver: zodResolver(updateActivitySchema),
  });

  useEffect(() => {
    if (activity) {
      reset({
        type: activity.type,
        subject: activity.subject,
        description: activity.description ?? '',
      });
    }
  }, [activity, reset]);

  if (isLoading) return <CircularProgress />;
  if (!activity) return null;

  const onSubmit = async (values: UpdateActivityFormValues) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    await updateMutation.mutateAsync(data);
    navigate(`/activities/${id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>Edit Activity</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select {...field} fullWidth displayEmpty>
                    {ACTIVITY_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Subject *" fullWidth {...register('subject')}
                error={!!errors.subject} helperText={errors.subject?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={3} {...register('description')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Scheduled At" fullWidth type="datetime-local" InputLabelProps={{ shrink: true }}
                {...register('scheduledAt')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Duration (min)" fullWidth type="number" {...register('durationMinutes', { valueAsNumber: true })} />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/activities/${id}`)}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default function ActivityFormPage() {
  const { id } = useParams<{ id?: string }>();
  return id ? <EditForm id={id} /> : <CreateForm />;
}
