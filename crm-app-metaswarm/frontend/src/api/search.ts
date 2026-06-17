import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/search';

export interface SearchItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  url: string;
}

export interface SearchGroup {
  items: SearchItem[];
  total: number;
}

export interface SearchResults {
  customers: SearchGroup;
  contacts: SearchGroup;
  opportunities: SearchGroup;
  activities: SearchGroup;
  tasks: SearchGroup;
  query: string;
  totalResults: number;
}

async function searchAll(
  token: string,
  q: string,
  params?: { types?: string; page?: number; pageSize?: number },
): Promise<SearchResults> {
  const qs = new URLSearchParams({ q, ...(params?.types && { types: params.types }) });
  if (params?.page) qs.set('page', String(params.page));
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize));

  const res = await fetch(`${BASE}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as { data?: SearchResults; error?: { code: string; message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Search failed: ${res.status}`);
  return json.data as SearchResults;
}

export function useSearch(q: string, params?: { types?: string; page?: number; pageSize?: number }) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['search', q, params],
    queryFn: () => searchAll(accessToken!, q, params),
    enabled: !!accessToken && q.length >= 2,
    staleTime: 30_000,
  });
}
