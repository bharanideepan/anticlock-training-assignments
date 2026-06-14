import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material';
import { useRequestPasswordReset, useResetPassword } from '../../api/auth.api';

const requestSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function PasswordResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const email = params.get('email') ?? '';
  const [done, setDone] = useState(false);

  const requestMutation = useRequestPasswordReset();
  const resetMutation = useResetPassword();

  const requestForm = useForm({ resolver: zodResolver(requestSchema) });
  const resetForm = useForm({ resolver: zodResolver(resetSchema) });

  if (done) {
    return (
      <Box sx={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh"}} >
        <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
          <Alert severity="success">Your password has been {token ? 'reset' : 'reset email sent'}. You can now sign in.</Alert>
          <Button fullWidth href="/login" sx={{ mt: 2 }}>Back to sign in</Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "background.default"}} >
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" sx={{mb: 3}} >
          {token ? 'Set new password' : 'Reset password'}
        </Typography>

        {token ? (
          <form onSubmit={resetForm.handleSubmit((v) =>
            resetMutation.mutate({ email, token, newPassword: v.newPassword }, { onSuccess: () => setDone(true) })
          )}>
            <TextField label="New password" type="password" fullWidth margin="normal"
              {...resetForm.register('newPassword')} error={!!resetForm.formState.errors.newPassword}
              helperText={resetForm.formState.errors.newPassword?.message} />
            <TextField label="Confirm password" type="password" fullWidth margin="normal"
              {...resetForm.register('confirmPassword')} error={!!resetForm.formState.errors.confirmPassword}
              helperText={resetForm.formState.errors.confirmPassword?.message} />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}
              disabled={resetMutation.isPending}>Set password</Button>
          </form>
        ) : (
          <form onSubmit={requestForm.handleSubmit((v) =>
            requestMutation.mutate(v.email, { onSuccess: () => setDone(true) })
          )}>
            <TextField label="Email" type="email" fullWidth margin="normal"
              {...requestForm.register('email')} error={!!requestForm.formState.errors.email}
              helperText={requestForm.formState.errors.email?.message} />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}
              disabled={requestMutation.isPending}>Send reset email</Button>
          </form>
        )}
      </Paper>
    </Box>
  );
}
