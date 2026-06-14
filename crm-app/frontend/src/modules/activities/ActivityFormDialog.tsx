import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Stack, TextField,
} from '@mui/material';
import { useCreateActivity } from '../../api/activities.api';
import type { ActivityType } from '../../shared/types/api.types';

const ACTIVITY_TYPES: ActivityType[] = ['PHONE_CALL', 'MEETING', 'EMAIL', 'NOTE', 'FOLLOW_UP'];

const schema = z.object({
  type: z.enum(['PHONE_CALL', 'MEETING', 'EMAIL', 'NOTE', 'FOLLOW_UP']),
  subject: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().optional().or(z.literal(0)).transform((v) => v || undefined),
});
type FormValues = z.infer<typeof schema>;

interface ActivityFormDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  contactId?: string;
  onCreated?: () => void;
}

export default function ActivityFormDialog({ open, onClose, customerId, contactId, onCreated }: ActivityFormDialogProps) {
  const createMutation = useCreateActivity();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PHONE_CALL', subject: '' },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      { ...values, customerId, contactId },
      {
        onSuccess: () => {
          reset();
          onClose();
          onCreated?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Log activity</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{pt: 1}} >
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select {...field} label="Type">
                    {ACTIVITY_TYPES.map((t) => (
                      <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <TextField label="Subject *" fullWidth {...register('subject')}
              error={!!errors.subject} helperText={errors.subject?.message} />

            <TextField label="Description" fullWidth multiline rows={3} {...register('description')} />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Scheduled at" type="datetime-local" fullWidth
                {...register('scheduledAt')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Duration (min)" type="number" fullWidth
                {...register('durationMinutes')}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Saving…' : 'Log activity'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
