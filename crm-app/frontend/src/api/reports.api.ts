import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';

export interface ReportFilter {
  fromDate: string;
  toDate: string;
  ownerId?: string;
  teamId?: string;
}

export function useReportData(reportType: string, filter: ReportFilter, enabled = true) {
  const endpoint = reportTypeToEndpoint(reportType);
  return useQuery({
    queryKey: ['reports', reportType, filter],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filter).filter(([, v]) => v !== undefined && v !== ''),
      );
      const { data } = await apiClient.get<ApiResponse<unknown>>(endpoint, { params });
      return data.data;
    },
    enabled: enabled && !!filter.fromDate && !!filter.toDate && !!endpoint,
  });
}

export function useReportExport() {
  return useMutation({
    mutationFn: async ({ reportType, filter }: { reportType: string; filter: ReportFilter }) => {
      const params = Object.fromEntries(
        Object.entries(filter).filter(([, v]) => v !== undefined && v !== ''),
      );
      const response = await apiClient.get(`/reports/${reportType}/export`, {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

function reportTypeToEndpoint(type: string): string {
  const map: Record<string, string> = {
    'sales-revenue': '/reports/sales/revenue',
    'sales-win-rate': '/reports/sales/win-rate',
    'sales-conversion': '/reports/sales/conversion-rate',
    'sales-opportunity-trends': '/reports/sales/opportunity-trends',
    'customers-growth': '/reports/customers/growth',
    'customers-distribution': '/reports/customers/distribution',
    'customers-industry': '/reports/customers/industry-analysis',
    'productivity-activity': '/reports/productivity/activity-completion',
    'productivity-task': '/reports/productivity/task-completion',
    'productivity-opportunity': '/reports/productivity/opportunity-ownership',
  };
  return map[type] ?? '';
}
