import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import { passwordResetSchema, type PasswordResetFormValues } from '../../shared/schemas/auth.schema';
import * as authApi from '../../api/auth.api';

export default function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
  });

  if (!token) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error">Invalid or missing reset token</Alert>
      </Box>
    );
  }

  const onSubmit = async (values: PasswordResetFormValues) => {
    setApiError(null);
    try {
      await authApi.resetPassword(token, values.newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Reset failed');
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
          Reset Password
        </Typography>

        {success ? (
          <Alert severity="success">Password has been reset. You can now sign in.</Alert>
        ) : (
          <>
            {apiError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {apiError}
              </Alert>
            )}

            <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2} noValidate>
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
                Reset Password
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
}
