import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { useAuth } from '../shared/hooks/useAuth';
import type { User } from '../shared/types/api.types';

interface LoginPayload { email: string; password: string }
interface LoginResponse { accessToken: string }

export function useLogin() {
  const { login } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post<{ data: LoginResponse }>('/auth/login', payload);
      return data.data;
    },
    onSuccess: async (data) => {
      const { data: meRes } = await apiClient.get<{ data: User }>('/auth/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      login(data.accessToken, meRes.data);
      await qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  const { logout } = useAuth();
  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSuccess: () => logout(),
  });
}

export function useMe() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: User }>('/auth/me');
      return data.data;
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { firstName?: string; lastName?: string; phone?: string; jobTitle?: string }) =>
      apiClient.patch('/auth/me', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => apiClient.post('/auth/password/reset-request', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (dto: { email: string; token: string; newPassword: string }) =>
      apiClient.post('/auth/password/reset', dto),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/password/change', dto),
  });
}
