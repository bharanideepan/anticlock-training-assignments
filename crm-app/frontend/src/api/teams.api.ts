import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

interface Team {
  id: string;
  name: string;
  description?: string;
  manager?: { id: string; firstName: string; lastName: string } | null;
  memberCount?: number;
  members?: { id: string; firstName: string; lastName: string; email: string; status: string }[];
  createdAt: string;
}

interface PaginatedTeams {
  data: Team[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface TeamsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useTeams(params: TeamsParams = {}) {
  return useQuery({
    queryKey: ['teams', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedTeams>('/teams', { params });
      return data;
    },
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Team }>(`/teams/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; description?: string; managerId?: string }) =>
      apiClient.post<{ data: Team }>('/teams', dto).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; description?: string; managerId?: string }) =>
      apiClient.patch<{ data: Team }>(`/teams/${id}`, dto).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/teams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useAddTeamMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) =>
      apiClient.post<{ data: Team }>(`/teams/${id}/members`, { userIds }).then((r) => r.data.data),
    onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: ['teams', id] }),
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      apiClient.delete(`/teams/${teamId}/members/${userId}`),
    onSuccess: (_data, { teamId }) => qc.invalidateQueries({ queryKey: ['teams', teamId] }),
  });
}
