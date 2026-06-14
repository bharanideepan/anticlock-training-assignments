import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Customer, CustomerStatus } from '../shared/types/api.types';

interface CustomerListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CustomerStatus;
  industry?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedCustomers {
  data: Customer[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface CreateCustomerPayload {
  companyName: string;
  industry?: string;
  website?: string;
  revenueRange?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  ownerId?: string;
}

export function useCustomers(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedCustomers>('/customers', { params });
      return data;
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Customer }>(`/customers/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCustomerPayload) =>
      apiClient.post<{ data: Customer }>('/customers', dto).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: Partial<CreateCustomerPayload> & { id: string }) =>
      apiClient.patch<{ data: Customer }>(`/customers/${id}`, dto).then((r) => r.data.data),
    onSuccess: (_d, { id }) => qc.invalidateQueries({ queryKey: ['customers', id] }),
  });
}

export function useCustomerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: CustomerStatus; reason?: string }) =>
      apiClient.post<{ data: Customer }>(`/customers/${id}/status`, { status, reason }).then((r) => r.data.data),
    onSuccess: (_d, { id }) => qc.invalidateQueries({ queryKey: ['customers', id] }),
  });
}

export function useArchiveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ data: Customer }>(`/customers/${id}/archive`).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUnarchiveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ data: Customer }>(`/customers/${id}/unarchive`).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useCustomerContacts(customerId: string, params: { page?: number; pageSize?: number; search?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: ['customers', customerId, 'contacts', params],
    queryFn: () => apiClient.get(`/customers/${customerId}/contacts`, { params }).then((r) => r.data),
    enabled: !!customerId && enabled,
  });
}

export function useCustomerActivities(customerId: string, params: { page?: number; pageSize?: number; type?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: ['customers', customerId, 'activities', params],
    queryFn: () => apiClient.get(`/customers/${customerId}/activities`, { params }).then((r) => r.data),
    enabled: !!customerId && enabled,
  });
}

export function useCustomerOpportunities(customerId: string, params: { page?: number; pageSize?: number } = {}, enabled = true) {
  return useQuery({
    queryKey: ['customers', customerId, 'opportunities', params],
    queryFn: () => apiClient.get(`/customers/${customerId}/opportunities`, { params }).then((r) => r.data),
    enabled: !!customerId && enabled,
  });
}

export function useCustomerTasks(customerId: string, params: { page?: number; pageSize?: number; status?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: ['customers', customerId, 'tasks', params],
    queryFn: () => apiClient.get(`/customers/${customerId}/tasks`, { params }).then((r) => r.data),
    enabled: !!customerId && enabled,
  });
}

export function useCustomerFiles(customerId: string, enabled = true) {
  return useQuery({
    queryKey: ['customers', customerId, 'files'],
    queryFn: () => apiClient.get(`/customers/${customerId}/files`).then((r) => r.data),
    enabled: !!customerId && enabled,
  });
}
