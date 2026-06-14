import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Contact } from '../shared/types/api.types';

interface ContactListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedContacts {
  data: Contact[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface CreateContactPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  notes?: string;
  customerId: string;
}

export function useContacts(params: ContactListParams = {}) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedContacts>('/contacts', { params });
      return data;
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Contact }>(`/contacts/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateContactPayload) =>
      apiClient.post<{ data: Contact }>('/contacts', dto).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: Partial<Omit<CreateContactPayload, 'customerId'>> & { id: string }) =>
      apiClient.patch<{ data: Contact }>(`/contacts/${id}`, dto).then((r) => r.data.data),
    onSuccess: (_d, { id }) => qc.invalidateQueries({ queryKey: ['contacts', id] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useContactActivities(contactId: string, params: { page?: number; pageSize?: number; type?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: ['contacts', contactId, 'activities', params],
    queryFn: () => apiClient.get(`/contacts/${contactId}/activities`, { params }).then((r) => r.data),
    enabled: !!contactId && enabled,
  });
}
