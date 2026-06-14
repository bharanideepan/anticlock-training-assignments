import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, TextField, Typography, Paper, Divider, Alert } from '@mui/material';
import { useLogin } from '../../api/auth.api';
import { useAuth } from '../../shared/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

const SSO_PROVIDER = import.meta.env.VITE_SSO_PROVIDER as string | undefined;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const loginMutation = useLogin();

  const onSubmit = (values: FormValues) => {
    loginMutation.mutate(values);
  };

  const handleSsoLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/sso/initiate`;
  };

  return (
    <Box sx={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "background.default"}} >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }} elevation={3}>
        <Typography variant="h5" sx={{textAlign: "center", mb: 3}} >Sign in to CRM</Typography>

        {loginMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Invalid email or password.
          </Alert>
        )}

        {SSO_PROVIDER && SSO_PROVIDER !== 'none' && (
          <>
            <Button fullWidth variant="outlined" onClick={handleSsoLogin} sx={{ mb: 2 }}>
              Sign in with {SSO_PROVIDER.toUpperCase()}
            </Button>
            <Divider sx={{ mb: 2 }}>or sign in with email</Divider>
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <Box sx={{textAlign: "center", mt: 2}} >
          <Button size="small" href="/password-reset">Forgot password?</Button>
        </Box>
      </Paper>
    </Box>
  );
}
