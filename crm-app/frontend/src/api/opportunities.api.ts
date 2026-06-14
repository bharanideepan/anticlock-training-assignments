import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Opportunity } from '../shared/types/api.types';

interface OpportunityListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  contactId?: string;
  ownerId?: string;
  stageId?: string;
  minRevenue?: number;
  maxRevenue?: number;
  closeDateFrom?: string;
  closeDateTo?: string;
  includeTerminal?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedOpportunities {
  data: Opportunity[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface CreateOpportunityPayload {
  name: string;
  customerId: string;
  contactId?: string;
  ownerId?: string;
  expectedRevenue?: number;
  probability?: number;
  expectedCloseDate?: string;
}

export function useOpportunities(params: OpportunityListParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['opportunities', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedOpportunities>('/opportunities', { params });
      return data;
    },
    enabled,
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ['opportunities', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Opportunity }>(`/opportunities/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOpportunityPayload) =>
      apiClient.post<{ data: Opportunity }>('/opportunities', dto).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  });
}

export function useUpdateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: Partial<CreateOpportunityPayload> & { id: string; notes?: string }) =>
      apiClient.patch<{ data: Opportunity }>(`/opportunities/${id}`, dto).then((r) => r.data.data),
    onSuccess: (_d, { id }) => qc.invalidateQueries({ queryKey: ['opportunities', id] }),
  });
}

export function useMoveOpportunityStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      apiClient.patch<{ data: Opportunity }>(`/opportunities/${id}/stage`, { stageId }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  });
}

export function useCloseWon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, closeNote }: { id: string; closeNote?: string }) =>
      apiClient.post<{ data: Opportunity }>(`/opportunities/${id}/close/won`, { closeNote }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  });
}

export function useCloseLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, closeNote }: { id: string; closeNote?: string }) =>
      apiClient.post<{ data: Opportunity }>(`/opportunities/${id}/close/lost`, { closeNote }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  });
}
