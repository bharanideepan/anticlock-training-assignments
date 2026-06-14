import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Task, PaginatedResult, ApiResponse } from '../shared/types/api.types';

export type TaskStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';
export type TaskType = 'FOLLOW_UP' | 'CALL' | 'MEETING' | 'EMAIL' | 'INTERNAL_ACTION';

export interface TaskFilters {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  type?: TaskType;
  assigneeId?: string;
  customerId?: string;
  opportunityId?: string;
  overdue?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTaskPayload {
  type: TaskType;
  title: string;
  description?: string;
  dueDate?: string;
  assigneeId?: string;
  customerId?: string;
  opportunityId?: string;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export function useTasks(filters: TaskFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
      );
      const { data } = await apiClient.get<PaginatedResult<Task>>('/tasks', { params });
      return data;
    },
    enabled,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const { data } = await apiClient.post<ApiResponse<Task>>('/tasks', payload);
      return data.data;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (task.customerId) {
        queryClient.invalidateQueries({ queryKey: ['customers', task.customerId, 'tasks'] });
      }
      if (task.opportunityId) {
        queryClient.invalidateQueries({ queryKey: ['opportunities', task.opportunityId, 'tasks'] });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskPayload }) => {
      const { data } = await apiClient.patch<ApiResponse<Task>>(`/tasks/${id}`, payload);
      return data.data;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/complete`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCancelTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/cancel`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
