import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Divider,
  Paper,
  Stack,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../api/auth.api';
import { loginSchema, type LoginFormValues } from '../../shared/schemas/auth.schema';
import { initiateSso } from '../../api/auth.api';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    try {
      const data = await authApi.login(values.email, values.password);
      login(data);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
          CRM Sign In
        </Typography>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Stack
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          spacing={2}
          noValidate
        >
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            fullWidth
            inputProps={{ 'aria-label': 'Email' }}
            {...register('email')}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
          />

          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            fullWidth
            inputProps={{ 'aria-label': 'Password' }}
            {...register('password')}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isLoading || isSubmitting}
            size="large"
          >
            Sign In
          </Button>
        </Stack>

        <Divider sx={{ my: 3 }}>or</Divider>

        <Button
          variant="outlined"
          fullWidth
          size="large"
          onClick={initiateSso}
        >
          Sign In with SSO
        </Button>
      </Paper>
    </Box>
  );
}
