import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/tasks';

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as { data?: T; error?: { code: string; message: string } };

  if (!res.ok) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }

  return json.data as T;
}

export type TaskType = 'FOLLOW_UP' | 'CALL' | 'MEETING' | 'EMAIL' | 'INTERNAL_ACTION';
export type TaskStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export interface TaskUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TaskCustomer {
  id: string;
  companyName: string;
}

export interface TaskOpportunity {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate: string;
  completedAt?: string;
  cancelledAt?: string;
  isOverdue: boolean;
  assigneeId: string;
  createdById: string;
  assignee: TaskUser;
  createdBy: TaskUser;
  customer?: TaskCustomer | null;
  opportunity?: TaskOpportunity | null;
  customerId?: string | null;
  opportunityId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTasks {
  data: Task[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export async function listTasks(token: string, params?: Record<string, string>): Promise<PaginatedTasks> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${BASE}${qs}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as PaginatedTasks & { error?: { message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  return json;
}

export function getTask(token: string, id: string): Promise<Task> {
  return apiFetch<Task>(`/${id}`, token);
}

export function createTask(token: string, data: Record<string, unknown>): Promise<Task> {
  return apiFetch<Task>('', token, { method: 'POST', body: JSON.stringify(data) });
}

export function updateTask(token: string, id: string, data: Record<string, unknown>): Promise<Task> {
  return apiFetch<Task>(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function completeTask(token: string, id: string): Promise<Task> {
  return apiFetch<Task>(`/${id}/complete`, token, { method: 'POST' });
}

export function cancelTask(token: string, id: string): Promise<Task> {
  return apiFetch<Task>(`/${id}/cancel`, token, { method: 'POST' });
}

export function deleteTask(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/${id}`, token, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useTasks(params?: Record<string, string>) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => listTasks(accessToken!, params),
    enabled: !!accessToken,
  });
}

export function useTask(id: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => getTask(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateTask() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createTask(accessToken!, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useUpdateTask(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => updateTask(accessToken!, id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });
}

export function useCompleteTask() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeTask(accessToken!, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useCancelTask() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelTask(accessToken!, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useDeleteTask() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(accessToken!, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}
