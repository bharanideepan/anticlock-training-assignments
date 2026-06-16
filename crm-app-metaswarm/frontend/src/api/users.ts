import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/users';

export interface UserRole {
  id: string;
  name: string;
}

export interface UserTeam {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  jobTitle?: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: UserRole;
  teams: UserTeam[];
  createdAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedUsers {
  data: User[];
  meta: PaginatedMeta;
}

export interface UserListParams {
  search?: string;
  roleId?: string;
  teamId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  jobTitle?: string;
  roleId: string;
  teamIds: string[];
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
}

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as { data: T };
  return json.data;
}

export async function listUsers(params: UserListParams, token: string): Promise<PaginatedUsers> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.roleId) qs.set('roleId', params.roleId);
  if (params.teamId) qs.set('teamId', params.teamId);
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);

  const query = qs.toString();
  const url = query ? `${BASE}?${query}` : BASE;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<PaginatedUsers>;
}

export async function getUser(id: string, token: string): Promise<User> {
  return apiFetch<User>(`/${id}`, token);
}

export async function createUser(dto: CreateUserDto, token: string): Promise<User> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = (await res.json()) as { data: User };
  return json.data;
}

export async function updateUser(id: string, dto: UpdateUserDto, token: string): Promise<User> {
  return apiFetch<User>(`/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deactivateUser(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/${id}/deactivate`, token, { method: 'POST' });
}

export async function reactivateUser(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/${id}/reactivate`, token, { method: 'POST' });
}

export async function resetUserPassword(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}

export async function updateUserRole(id: string, roleId: string, token: string): Promise<User> {
  return apiFetch<User>(`/${id}/role`, token, {
    method: 'PATCH',
    body: JSON.stringify({ roleId }),
  });
}

export async function updateUserTeams(id: string, teamIds: string[], token: string): Promise<User> {
  return apiFetch<User>(`/${id}/teams`, token, {
    method: 'PATCH',
    body: JSON.stringify({ teamIds }),
  });
}

// TanStack Query hooks

export function useUsers(params: UserListParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsers(params, accessToken ?? ''),
    enabled: !!accessToken,
  });
}

export function useUser(id: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser(id, accessToken ?? ''),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateUser() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserDto) => createUser(dto, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser(id: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateUserDto) => updateUser(id, dto, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

export function useDeactivateUser() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id, accessToken ?? ''),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

export function useReactivateUser() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateUser(id, accessToken ?? ''),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

export function useResetUserPassword() {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: (id: string) => resetUserPassword(id, accessToken ?? ''),
  });
}

export function useUpdateUserRole(id: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => updateUserRole(id, roleId, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}

export function useUpdateUserTeams(id: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamIds: string[]) => updateUserTeams(id, teamIds, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', id] });
    },
  });
}
