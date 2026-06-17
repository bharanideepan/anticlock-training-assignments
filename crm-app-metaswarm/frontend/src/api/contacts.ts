import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/contacts';

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

export interface ContactCustomer {
  id: string;
  companyName: string;
  ownerId: string;
}

export interface ContactCount {
  activities: number;
  opportunities: number;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  notes?: string;
  customerId: string;
  customer: ContactCustomer;
  _count: ContactCount;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ContactListResponse {
  data: Contact[];
  meta: ContactListMeta;
}

export interface ContactQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listContacts(
  params: ContactQueryParams,
  token: string,
): Promise<ContactListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (params.customerId) qs.set('customerId', params.customerId);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);

  const res = await fetch(`${BASE}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as ContactListResponse;
}

export async function getContact(id: string, token: string): Promise<Contact> {
  return apiFetch<Contact>(`/${id}`, token);
}

export async function createContact(
  data: Record<string, unknown>,
  token: string,
): Promise<Contact> {
  return apiFetch<Contact>('', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateContact(
  id: string,
  data: Record<string, unknown>,
  token: string,
): Promise<Contact> {
  return apiFetch<Contact>(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteContact(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/${id}`, token, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useContacts(params: ContactQueryParams = {}) {
  const { accessToken } = useAuth();
  return useQuery<ContactListResponse>({
    queryKey: ['contacts', params],
    queryFn: () => listContacts(params, accessToken ?? ''),
    enabled: !!accessToken,
  });
}

export function useContact(id: string) {
  const { accessToken } = useAuth();
  return useQuery<Contact>({
    queryKey: ['contact', id],
    queryFn: () => getContact(id, accessToken ?? ''),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateContact() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Contact, Error, Record<string, unknown>>({
    mutationFn: (data) => createContact(data, accessToken ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUpdateContact(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Contact, Error, Record<string, unknown>>({
    mutationFn: (data) => updateContact(id, data, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact', id] });
    },
  });
}

export function useDeleteContact(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => deleteContact(id, accessToken ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}
