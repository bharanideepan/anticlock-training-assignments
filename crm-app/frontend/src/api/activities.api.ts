import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Activity, ActivityType } from '../shared/types/api.types';

interface ActivityListParams {
  page?: number;
  pageSize?: number;
  customerId?: string;
  contactId?: string;
  type?: ActivityType;
  createdById?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedActivities {
  data: Activity[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface CreateActivityPayload {
  type: ActivityType;
  subject: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  customerId: string;
  contactId?: string;
}

export function useActivities(params: ActivityListParams = {}) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedActivities>('/activities', { params });
      return data;
    },
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ['activities', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Activity }>(`/activities/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateActivityPayload) =>
      apiClient.post<{ data: Activity }>('/activities', dto).then((r) => r.data.data),
    onSuccess: (_d, { customerId }) => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'activities'] });
    },
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: Partial<CreateActivityPayload> & { id: string }) =>
      apiClient.patch<{ data: Activity }>(`/activities/${id}`, dto).then((r) => r.data.data),
    onSuccess: (_d, { id }) => qc.invalidateQueries({ queryKey: ['activities', id] }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/activities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}
