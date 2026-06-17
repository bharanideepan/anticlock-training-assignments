import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/reports';

async function apiFetch<T>(path: string, token: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as { data?: T; error?: { code: string; message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  return json.data as T;
}

export interface ReportParams {
  fromDate: string;
  toDate: string;
  ownerId?: string;
  teamId?: string;
}

function toQueryParams(params: ReportParams): Record<string, string> {
  const p: Record<string, string> = { fromDate: params.fromDate, toDate: params.toDate };
  if (params.ownerId) p['ownerId'] = params.ownerId;
  if (params.teamId) p['teamId'] = params.teamId;
  return p;
}

export function useSalesRevenue(params: ReportParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'sales-revenue', params],
    queryFn: () => apiFetch('/sales/revenue', accessToken!, toQueryParams(params)),
    enabled: !!accessToken && !!params.fromDate && !!params.toDate,
  });
}

export function useSalesWinRate(params: ReportParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'sales-win-rate', params],
    queryFn: () => apiFetch('/sales/win-rate', accessToken!, toQueryParams(params)),
    enabled: !!accessToken && !!params.fromDate && !!params.toDate,
  });
}

export function useSalesConversionRate(params: ReportParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'sales-conversion', params],
    queryFn: () => apiFetch('/sales/conversion-rate', accessToken!, toQueryParams(params)),
    enabled: !!accessToken && !!params.fromDate && !!params.toDate,
  });
}

export function useCustomersGrowth(params: ReportParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'customers-growth', params],
    queryFn: () => apiFetch('/customers/growth', accessToken!, toQueryParams(params)),
    enabled: !!accessToken && !!params.fromDate && !!params.toDate,
  });
}

export function useCustomersDistribution(params: ReportParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'customers-distribution', params],
    queryFn: () => apiFetch('/customers/distribution', accessToken!, toQueryParams(params)),
    enabled: !!accessToken && !!params.fromDate && !!params.toDate,
  });
}

export function useProductivityTaskCompletion(params: ReportParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['reports', 'productivity-task', params],
    queryFn: () => apiFetch('/productivity/task-completion', accessToken!, toQueryParams(params)),
    enabled: !!accessToken && !!params.fromDate && !!params.toDate,
  });
}

export async function downloadReport(token: string, reportType: string, params: ReportParams): Promise<void> {
  const qs = new URLSearchParams(toQueryParams(params)).toString();
  const res = await fetch(`${BASE}/${reportType}/export?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${reportType}-${params.fromDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
