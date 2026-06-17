import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/dashboard';

async function apiFetch<T>(path: string, token: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${BASE}${path}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as { data?: T; error?: { code: string; message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  return json.data as T;
}

export interface DashboardMetrics {
  totalCustomers: number;
  newCustomersThisPeriod: number;
  activeOpportunities: number;
  wonOpportunitiesThisPeriod: number;
  lostOpportunitiesThisPeriod: number;
  pipelineValue: string;
  revenueForecast: string;
  openTasks: number;
  overdueTasks: number;
  period: string;
}

export interface RevenueTrend {
  labels: string[];
  wonRevenue: number[];
  forecastRevenue: number[];
}

export interface PipelineFunnelItem {
  stage: string;
  count: number;
  value: string;
}

export interface ActivityTrend {
  labels: string[];
  phoneCall: number[];
  meeting: number[];
  email: number[];
  note: number[];
  followUp: number[];
}

export interface TeamPerformanceItem {
  user: { id: string; firstName: string; lastName: string };
  wonOpportunities: number;
  wonRevenue: string;
  activitiesLogged: number;
  tasksCompleted: number;
  openOpportunities: number;
}

export interface OpportunityDistributionItem {
  industry: string;
  count: number;
  value: string;
}

export function useDashboardMetrics() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => apiFetch<DashboardMetrics>('/metrics', accessToken!),
    enabled: !!accessToken,
  });
}

export function useRevenueTrend(months = 6) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'revenue-trend', months],
    queryFn: () => apiFetch<RevenueTrend>('/charts/revenue-trend', accessToken!, { months: String(months) }),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineFunnel() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'pipeline-funnel'],
    queryFn: () => apiFetch<PipelineFunnelItem[]>('/charts/pipeline-funnel', accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivityTrend(days = 30) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'activity-trend', days],
    queryFn: () => apiFetch<ActivityTrend>('/charts/activity-trend', accessToken!, { days: String(days) }),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamPerformance() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'team-performance'],
    queryFn: () => apiFetch<TeamPerformanceItem[]>('/charts/team-performance', accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOpportunityDistribution() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'opportunity-distribution'],
    queryFn: () => apiFetch<OpportunityDistributionItem[]>('/charts/opportunity-distribution', accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}
