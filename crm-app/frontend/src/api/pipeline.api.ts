import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PipelineStage } from '../shared/types/api.types';

interface PipelineBoardColumn {
  stage: { id: string; name: string; displayOrder: number };
  opportunities: {
    id: string;
    name: string;
    expectedRevenue?: string;
    expectedCloseDate?: string;
    owner?: { id: string; firstName: string; lastName: string };
  }[];
  totalValue: string;
  count: number;
}

interface PipelineFilterParams {
  ownerId?: string;
  search?: string;
  closeDateFrom?: string;
  closeDateTo?: string;
}

export function usePipelineBoard(params: PipelineFilterParams = {}) {
  return useQuery({
    queryKey: ['pipeline-board', params],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: PipelineBoardColumn[] }>('/pipeline', { params });
      return data.data as PipelineBoardColumn[];
    },
  });
}

export function usePipelineStages() {
  return useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data } = await apiClient.get<PipelineStage[]>('/pipeline/stages');
      return data;
    },
  });
}

export function useUpdateOpportunityStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      apiClient.patch(`/opportunities/${id}/stage`, { stageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-board'] }),
  });
}

export function useCreateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; displayOrder?: number }) =>
      apiClient.post('/pipeline/stages', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; displayOrder?: number; isDefault?: boolean }) =>
      apiClient.patch(`/pipeline/stages/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pipeline/stages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  });
}

export function useReorderStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stageIds: string[]) =>
      apiClient.patch('/pipeline/stages/reorder', { stageIds }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  });
}
