import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/notifications';

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
  if (!res.ok) throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  return json.data as T;
}

export type NotificationType = 'TASK_ASSIGNED' | 'OPPORTUNITY_ASSIGNED' | 'DUE_DATE_REMINDER' | 'OVERDUE_TASK' | 'CUSTOMER_UPDATED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceType?: string | null;
  resourceId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  meta: { total: number; unreadCount: number; page: number; pageSize: number; totalPages: number };
}

export function listNotifications(token: string, params?: Record<string, string>): Promise<PaginatedNotifications> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  return apiFetch<PaginatedNotifications>(qs, token);
}

export function markNotificationRead(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/${id}/read`, token, { method: 'POST' });
}

export function markAllNotificationsRead(token: string): Promise<void> {
  return apiFetch<void>('/read-all', token, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useNotifications(params?: Record<string, string>) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => listNotifications(accessToken!, params),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const result = await listNotifications(accessToken!, { unreadOnly: 'true', pageSize: '1' });
      return result.meta.unreadCount;
    },
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(accessToken!, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });
}

export function useMarkAllRead() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(accessToken!),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });
}
