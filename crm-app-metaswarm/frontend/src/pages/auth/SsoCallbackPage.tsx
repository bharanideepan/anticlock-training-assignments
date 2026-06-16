import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../api/auth.api';
import { useState } from 'react';

export default function SsoCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Backend issued a short-lived token we can exchange
      authApi
        .getMe(token)
        .then((user) => {
          login({ accessToken: token, expiresIn: 900, user });
          navigate('/', { replace: true });
        })
        .catch(() => setError('SSO authentication failed'));
    } else {
      // Token comes via cookie — just fetch /me with the cookie-based refresh
      authApi
        .refresh()
        .then((data) => authApi.getMe(data.accessToken).then((u) => ({ ...data, user: u })))
        .then((data) => {
          login(data);
          navigate('/', { replace: true });
        })
        .catch(() => setError('SSO authentication failed'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount — SSO callback is a one-shot operation

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh" gap={2}>
      <CircularProgress />
      <Typography>Completing sign-in…</Typography>
    </Box>
  );
}
