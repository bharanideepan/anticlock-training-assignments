import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/teams';

export interface TeamManager {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  manager?: TeamManager;
  memberCount: number;
}

export interface TeamDetail extends Team {
  members?: TeamMember[];
}

export interface PaginatedTeams {
  data: Team[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface TeamListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTeamDto {
  name: string;
  description?: string;
  managerId?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
  managerId?: string;
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

export async function listTeams(params: TeamListParams, token: string): Promise<PaginatedTeams> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
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

  return res.json() as Promise<PaginatedTeams>;
}

export async function getTeam(id: string, token: string): Promise<TeamDetail> {
  return apiFetch<TeamDetail>(`/${id}`, token);
}

export async function createTeam(dto: CreateTeamDto, token: string): Promise<Team> {
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

  const json = (await res.json()) as { data: Team };
  return json.data;
}

export async function updateTeam(id: string, dto: UpdateTeamDto, token: string): Promise<Team> {
  return apiFetch<Team>(`/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteTeam(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/${id}`, token, { method: 'DELETE' });
}

export async function addTeamMembers(id: string, userIds: string[], token: string): Promise<Team> {
  return apiFetch<Team>(`/${id}/members`, token, {
    method: 'POST',
    body: JSON.stringify({ userIds }),
  });
}

export async function removeTeamMember(teamId: string, userId: string, token: string): Promise<void> {
  return apiFetch<void>(`/${teamId}/members/${userId}`, token, { method: 'DELETE' });
}

// TanStack Query hooks

export function useTeams(params: TeamListParams = {}) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['teams', params],
    queryFn: () => listTeams(params, accessToken ?? ''),
    enabled: !!accessToken,
  });
}

export function useTeam(id: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['teams', id],
    queryFn: () => getTeam(id, accessToken ?? ''),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateTeam() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTeamDto) => createTeam(dto, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam(id: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateTeamDto) => updateTeam(id, dto, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams', id] });
    },
  });
}

export function useDeleteTeam() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTeam(id, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useAddTeamMembers(teamId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => addTeamMembers(teamId, userIds, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useRemoveTeamMember(teamId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeTeamMember(teamId, userId, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}
