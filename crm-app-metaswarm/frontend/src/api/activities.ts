import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/activities';

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

export type ActivityType = 'PHONE_CALL' | 'MEETING' | 'EMAIL' | 'NOTE' | 'FOLLOW_UP';

export interface ActivityCustomer {
  id: string;
  companyName: string;
  ownerId: string;
}

export interface ActivityContact {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ActivityCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  customerId: string;
  contactId?: string;
  createdById: string;
  customer: ActivityCustomer;
  contact: ActivityContact | null;
  createdBy: ActivityCreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityListResponse {
  data: Activity[];
  meta: ActivityListMeta;
}

export interface ActivityQueryParams {
  page?: number;
  pageSize?: number;
  type?: ActivityType;
  customerId?: string;
  contactId?: string;
  createdById?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'scheduledAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export async function listActivities(
  params: ActivityQueryParams,
  token: string,
): Promise<ActivityListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.type) qs.set('type', params.type);
  if (params.customerId) qs.set('customerId', params.customerId);
  if (params.contactId) qs.set('contactId', params.contactId);
  if (params.createdById) qs.set('createdById', params.createdById);
  if (params.fromDate) qs.set('fromDate', params.fromDate);
  if (params.toDate) qs.set('toDate', params.toDate);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);

  const res = await fetch(`${BASE}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as ActivityListResponse;
}

export async function getActivity(id: string, token: string): Promise<Activity> {
  return apiFetch<Activity>(`/${id}`, token);
}

export async function createActivity(
  data: Record<string, unknown>,
  token: string,
): Promise<Activity> {
  return apiFetch<Activity>('', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateActivity(
  id: string,
  data: Record<string, unknown>,
  token: string,
): Promise<Activity> {
  return apiFetch<Activity>(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteActivity(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/${id}`, token, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useActivities(params: ActivityQueryParams = {}) {
  const { accessToken } = useAuth();
  return useQuery<ActivityListResponse>({
    queryKey: ['activities', params],
    queryFn: () => listActivities(params, accessToken ?? ''),
    enabled: !!accessToken,
  });
}

export function useActivity(id: string) {
  const { accessToken } = useAuth();
  return useQuery<Activity>({
    queryKey: ['activity', id],
    queryFn: () => getActivity(id, accessToken ?? ''),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateActivity() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Activity, Error, Record<string, unknown>>({
    mutationFn: (data) => createActivity(data, accessToken ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useUpdateActivity(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Activity, Error, Record<string, unknown>>({
    mutationFn: (data) => updateActivity(id, data, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['activity', id] });
    },
  });
}

export function useDeleteActivity(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => deleteActivity(id, accessToken ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}
