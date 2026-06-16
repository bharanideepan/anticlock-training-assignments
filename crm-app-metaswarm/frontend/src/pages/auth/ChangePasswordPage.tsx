import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import { changePasswordSchema, type ChangePasswordFormValues } from '../../shared/schemas/auth.schema';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../api/auth.api';

export default function ChangePasswordPage() {
  const { accessToken } = useAuth();
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setApiError(null);
    try {
      await authApi.changePassword(accessToken ?? '', values.currentPassword, values.newPassword);
      setSuccess(true);
      reset();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to change password');
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
          Change Password
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password changed successfully
          </Alert>
        )}

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2} noValidate>
          <TextField
            label="Current Password"
            type="password"
            fullWidth
            inputProps={{ 'aria-label': 'Current Password' }}
            {...register('currentPassword')}
            error={Boolean(errors.currentPassword)}
            helperText={errors.currentPassword?.message}
          />

          <TextField
            label="New Password"
            type="password"
            fullWidth
            inputProps={{ 'aria-label': 'New Password' }}
            {...register('newPassword')}
            error={Boolean(errors.newPassword)}
            helperText={errors.newPassword?.message}
          />

          <TextField
            label="Confirm Password"
            type="password"
            fullWidth
            inputProps={{ 'aria-label': 'Confirm Password' }}
            {...register('confirmPassword')}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSubmitting}
            size="large"
          >
            Change Password
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
