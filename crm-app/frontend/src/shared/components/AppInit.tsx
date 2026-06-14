import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { setAccessToken } from '../../api/client';
import type { User } from '../types/api.types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export default function AppInit({ children }: { children: React.ReactNode }) {
  const { login } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: refreshData } = await axios.post<{ data: { accessToken: string } }>(
          `${BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const token = refreshData.data.accessToken;
        setAccessToken(token);
        const { data: meData } = await axios.get<{ data: User }>(
          `${BASE_URL}/api/v1/auth/me`,
          { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
        );
        login(token, meData.data);
      } catch {
        // No valid session — user will be directed to /login by AuthGuard
      } finally {
        setReady(true);
      }
    })();
  }, [login]);

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}
