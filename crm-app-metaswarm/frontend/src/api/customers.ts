import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/customers';

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

export interface CustomerCount {
  contacts: number;
  activities: number;
  opportunities: number;
  tasks: number;
}

export interface CustomerOwner {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Customer {
  id: string;
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
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  ownerId: string;
  owner: CustomerOwner;
  _count: CustomerCount;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerListResponse {
  data: Customer[];
  meta: CustomerListMeta;
}

export interface CustomerQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  industry?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listCustomers(
  params: CustomerQueryParams,
  token: string,
): Promise<CustomerListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.industry) qs.set('industry', params.industry);
  if (params.ownerId) qs.set('ownerId', params.ownerId);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);

  const res = await fetch(`${BASE}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as CustomerListResponse;
  return json;
}

export async function getCustomer(id: string, token: string): Promise<Customer> {
  return apiFetch<Customer>(`/${id}`, token);
}

export async function createCustomer(
  data: Record<string, unknown>,
  token: string,
): Promise<Customer> {
  return apiFetch<Customer>('', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCustomer(
  id: string,
  data: Record<string, unknown>,
  token: string,
): Promise<Customer> {
  return apiFetch<Customer>(`/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateCustomerStatus(
  id: string,
  data: { status: string; reason?: string },
  token: string,
): Promise<Customer> {
  return apiFetch<Customer>(`/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function archiveCustomer(id: string, token: string): Promise<Customer> {
  return apiFetch<Customer>(`/${id}/archive`, token, { method: 'POST' });
}

export async function unarchiveCustomer(id: string, token: string): Promise<Customer> {
  return apiFetch<Customer>(`/${id}/unarchive`, token, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useCustomers(params: CustomerQueryParams = {}) {
  const { accessToken } = useAuth();
  return useQuery<CustomerListResponse>({
    queryKey: ['customers', params],
    queryFn: () => listCustomers(params, accessToken ?? ''),
    enabled: !!accessToken,
  });
}

export function useCustomer(id: string) {
  const { accessToken } = useAuth();
  return useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id, accessToken ?? ''),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateCustomer() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Customer, Error, Record<string, unknown>>({
    mutationFn: (data) => createCustomer(data, accessToken ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Customer, Error, Record<string, unknown>>({
    mutationFn: (data) => updateCustomer(id, data, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

export function useUpdateCustomerStatus(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Customer, Error, { status: string; reason?: string }>({
    mutationFn: (data) => updateCustomerStatus(id, data, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

export function useArchiveCustomer(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Customer, Error, void>({
    mutationFn: () => archiveCustomer(id, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

export function useUnarchiveCustomer(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Customer, Error, void>({
    mutationFn: () => unarchiveCustomer(id, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}
