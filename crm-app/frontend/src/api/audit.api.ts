import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PaginatedResult, AuditLog } from '../shared/types/api.types';

export interface AuditFilterParams {
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
}

async function fetchAuditLogs(params: AuditFilterParams): Promise<PaginatedResult<AuditLog>> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') searchParams.set(k, String(v));
  });
  const res = await apiClient.get<PaginatedResult<AuditLog>>(`/audit/logs?${searchParams.toString()}`);
  return res.data;
}

export function useAuditLogs(params: AuditFilterParams) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => fetchAuditLogs(params),
    staleTime: 15_000,
  });
}
