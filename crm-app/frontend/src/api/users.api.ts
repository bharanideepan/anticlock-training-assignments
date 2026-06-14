import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { User } from '../shared/types/api.types';

interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string;
  teamId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedUsers {
  data: User[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  jobTitle?: string;
  roleId: string;
  teamIds?: string[];
}

interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
}

export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedUsers>('/users', { params });
      return data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: User }>(`/users/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserPayload) =>
      apiClient.post<{ data: User }>('/users', dto).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateUserPayload & { id: string }) =>
      apiClient.patch<{ data: User }>(`/users/${id}`, dto).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/users/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/users/${id}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/users/${id}/reset-password`),
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) =>
      apiClient.patch<{ data: User }>(`/users/${id}/role`, { roleId }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useAssignTeams() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teamIds }: { id: string; teamIds: string[] }) =>
      apiClient.patch<{ data: User }>(`/users/${id}/teams`, { teamIds }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
