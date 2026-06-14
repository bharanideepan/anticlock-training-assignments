import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';

export interface DashboardMetrics {
  totalCustomers: number;
  newCustomersThisPeriod: number;
  activeOpportunities: number;
  wonOpportunitiesThisPeriod: number;
  lostOpportunitiesThisPeriod: number;
  pipelineValue: string;
  revenueForcast: string;
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
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DashboardMetrics>>('/dashboard/metrics');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueTrend(months = 6) {
  return useQuery({
    queryKey: ['dashboard', 'revenue-trend', months],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RevenueTrend>>('/dashboard/charts/revenue-trend', { params: { months } });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineFunnel() {
  return useQuery({
    queryKey: ['dashboard', 'pipeline-funnel'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<PipelineFunnelItem[]>>('/dashboard/charts/pipeline-funnel');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivityTrend(days = 30) {
  return useQuery({
    queryKey: ['dashboard', 'activity-trend', days],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ActivityTrend>>('/dashboard/charts/activity-trend', { params: { days } });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamPerformance() {
  return useQuery({
    queryKey: ['dashboard', 'team-performance'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TeamPerformanceItem[]>>('/dashboard/charts/team-performance');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useOpportunityDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'opportunity-distribution'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<OpportunityDistributionItem[]>>('/dashboard/charts/opportunity-distribution');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
