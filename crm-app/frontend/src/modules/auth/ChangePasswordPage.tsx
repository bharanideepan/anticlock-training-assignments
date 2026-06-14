import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material';
import { useChangePassword } from '../../api/auth.api';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string().min(8),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const mutation = useChangePassword();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => { reset(); navigate('/dashboard'); } },
    );
  };

  return (
    <Box sx={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "background.default"}} >
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" sx={{mb: 3}} >Change password</Typography>

        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Current password is incorrect or an error occurred.
          </Alert>
        )}
        {mutation.isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully.</Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField label="Current password" type="password" fullWidth margin="normal"
            {...register('currentPassword')} error={!!errors.currentPassword}
            helperText={errors.currentPassword?.message} />
          <TextField label="New password" type="password" fullWidth margin="normal"
            {...register('newPassword')} error={!!errors.newPassword}
            helperText={errors.newPassword?.message} />
          <TextField label="Confirm new password" type="password" fullWidth margin="normal"
            {...register('confirmPassword')} error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message} />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}
            disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Change password'}
          </Button>
          <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate(-1)}>Cancel</Button>
        </form>
      </Paper>
    </Box>
  );
}
