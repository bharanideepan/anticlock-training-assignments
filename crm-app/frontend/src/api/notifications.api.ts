import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from './client';
import type { Notification, PaginatedResult } from '../shared/types/api.types';

export interface NotificationFilters {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined),
      );
      const { data } = await apiClient.get<{ data: PaginatedResult<Notification> }>('/notifications', { params });
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { meta: { unreadCount?: number } } }>('/notifications', {
        params: { unreadOnly: true, pageSize: 1 },
      });
      return data.data.meta.unreadCount ?? 0;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationStream(onNotification: (n: Notification) => void) {
  const queryClient = useQueryClient();
  const stableCallback = useCallback((n: Notification) => onNotification(n), [onNotification]);

  return useQuery({
    queryKey: ['notifications', 'stream'],
    queryFn: () => {
      return new Promise<null>(() => {
        const token = localStorage.getItem('accessToken') || '';
        const baseUrl = apiClient.defaults.baseURL ?? '';
        const url = `${baseUrl}/notifications/stream`;
        const eventSource = new EventSource(url + `?token=${token}`);

        eventSource.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data);
            stableCallback(notification);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          } catch { /* ignore JSON parse errors */ }
        };

        eventSource.onerror = () => {
          eventSource.close();
        };
      });
    },
    staleTime: Infinity,
    retry: false,
  });
}
