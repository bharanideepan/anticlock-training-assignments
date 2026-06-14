import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { apiClient } from '../../api/client';
import { useAuth } from '../../shared/hooks/useAuth';
import type { User } from '../../shared/types/api.types';

export default function SsoCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { navigate('/login'); return; }

    apiClient
      .get<{ data: User }>('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        login(token, data.data);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => navigate('/login'));
  }, [params, login, navigate]);

  return (
    <Box sx={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh"}} >
      <CircularProgress />
      <Typography sx={{mt: 2}} >Completing sign-in…</Typography>
    </Box>
  );
}
