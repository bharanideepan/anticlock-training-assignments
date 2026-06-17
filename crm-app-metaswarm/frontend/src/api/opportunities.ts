import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1';

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

export interface PipelineStage {
  id: string;
  name: string;
  displayOrder: number;
  isDefault: boolean;
  isTerminal: boolean;
  terminalOutcome: 'WON' | 'LOST' | null;
}

export interface OpportunityCustomer { id: string; companyName: string }
export interface OpportunityContact { id: string; firstName: string; lastName: string }
export interface OpportunityOwner { id: string; firstName: string; lastName: string }

export interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  contactId?: string;
  ownerId: string;
  stageId: string;
  expectedRevenue?: string;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  closeNote?: string;
  stage: Omit<PipelineStage, 'isDefault'>;
  customer: OpportunityCustomer;
  contact: OpportunityContact | null;
  owner: OpportunityOwner;
  _count: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityListMeta { total: number; page: number; pageSize: number; totalPages: number }
export interface OpportunityListResponse { data: Opportunity[]; meta: OpportunityListMeta }

export interface OpportunityQueryParams {
  page?: number; pageSize?: number; search?: string; customerId?: string; ownerId?: string;
  stageId?: string; minRevenue?: number; maxRevenue?: number; closeDateFrom?: string;
  closeDateTo?: string; includeTerminal?: boolean; sortBy?: string; sortOrder?: 'asc' | 'desc';
}

export interface PipelineBoardColumn {
  stage: { id: string; name: string; displayOrder: number };
  opportunities: Array<{ id: string; name: string; expectedRevenue?: string; expectedCloseDate?: string; owner: OpportunityOwner }>;
  totalValue: string;
  count: number;
}

export interface PipelineBoardResponse { data: PipelineBoardColumn[] }

export async function listOpportunities(params: OpportunityQueryParams, token: string): Promise<OpportunityListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
  const res = await fetch(`${BASE}/opportunities?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()) as OpportunityListResponse;
}

export async function getOpportunity(id: string, token: string): Promise<Opportunity> {
  return apiFetch<Opportunity>(`/opportunities/${id}`, token);
}

export async function createOpportunity(data: Record<string, unknown>, token: string): Promise<Opportunity> {
  return apiFetch<Opportunity>('/opportunities', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateOpportunity(id: string, data: Record<string, unknown>, token: string): Promise<Opportunity> {
  return apiFetch<Opportunity>(`/opportunities/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function moveOpportunityStage(id: string, stageId: string, token: string): Promise<Opportunity> {
  return apiFetch<Opportunity>(`/opportunities/${id}/stage`, token, { method: 'PATCH', body: JSON.stringify({ stageId }) });
}

export async function closeOpportunityWon(id: string, closeNote: string | undefined, token: string): Promise<Opportunity> {
  return apiFetch<Opportunity>(`/opportunities/${id}/close/won`, token, { method: 'POST', body: JSON.stringify({ closeNote }) });
}

export async function closeOpportunityLost(id: string, closeNote: string | undefined, token: string): Promise<Opportunity> {
  return apiFetch<Opportunity>(`/opportunities/${id}/close/lost`, token, { method: 'POST', body: JSON.stringify({ closeNote }) });
}

export async function getPipelineBoard(params: { ownerId?: string; search?: string }, token: string): Promise<PipelineBoardResponse> {
  const qs = new URLSearchParams();
  if (params.ownerId) qs.set('ownerId', params.ownerId);
  if (params.search) qs.set('search', params.search);
  const res = await fetch(`${BASE}/pipeline?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()) as PipelineBoardResponse;
}

export async function getStages(token: string): Promise<PipelineStage[]> {
  return apiFetch<PipelineStage[]>('/pipeline/stages', token);
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useOpportunities(params: OpportunityQueryParams = {}) {
  const { accessToken } = useAuth();
  return useQuery<OpportunityListResponse>({
    queryKey: ['opportunities', params],
    queryFn: () => listOpportunities(params, accessToken ?? ''),
    enabled: !!accessToken,
  });
}

export function useOpportunity(id: string) {
  const { accessToken } = useAuth();
  return useQuery<Opportunity>({
    queryKey: ['opportunity', id],
    queryFn: () => getOpportunity(id, accessToken ?? ''),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateOpportunity() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Opportunity, Error, Record<string, unknown>>({
    mutationFn: (data) => createOpportunity(data, accessToken ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  });
}

export function useUpdateOpportunity(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Opportunity, Error, Record<string, unknown>>({
    mutationFn: (data) => updateOpportunity(id, data, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity', id] });
    },
  });
}

export function useMoveStage(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Opportunity, Error, string>({
    mutationFn: (stageId) => moveOpportunityStage(id, stageId, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity', id] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useCloseWon(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Opportunity, Error, string | undefined>({
    mutationFn: (closeNote) => closeOpportunityWon(id, closeNote, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity', id] });
    },
  });
}

export function useCloseLost(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<Opportunity, Error, string | undefined>({
    mutationFn: (closeNote) => closeOpportunityLost(id, closeNote, accessToken ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity', id] });
    },
  });
}

export function usePipelineBoard(params: { ownerId?: string; search?: string } = {}) {
  const { accessToken } = useAuth();
  return useQuery<PipelineBoardResponse>({
    queryKey: ['pipeline', params],
    queryFn: () => getPipelineBoard(params, accessToken ?? ''),
    enabled: !!accessToken,
  });
}

export function useStages() {
  const { accessToken } = useAuth();
  return useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages'],
    queryFn: () => getStages(accessToken ?? ''),
    enabled: !!accessToken,
  });
}
