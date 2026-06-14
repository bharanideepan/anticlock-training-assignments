import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
}

export interface SearchResultGroup {
  items: SearchResultItem[];
  total: number;
}

export interface SearchResult {
  customers: SearchResultGroup;
  contacts: SearchResultGroup;
  opportunities: SearchResultGroup;
  activities: SearchResultGroup;
  tasks: SearchResultGroup;
  query: string;
  totalResults: number;
}

async function search(q: string, types?: string, pageSize = 10): Promise<SearchResult> {
  const params = new URLSearchParams({ q, pageSize: String(pageSize) });
  if (types) params.set('types', types);
  const res = await apiClient.get<{ data: SearchResult }>(`/search?${params.toString()}`);
  return res.data.data;
}

export function useSearch(q: string, types?: string, pageSize = 10) {
  return useQuery({
    queryKey: ['search', q, types, pageSize],
    queryFn: () => search(q, types, pageSize),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });
}
