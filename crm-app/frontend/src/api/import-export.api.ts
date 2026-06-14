import { useMutation } from '@tanstack/react-query';
import { apiClient } from './client';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

async function importEntity(entity: 'customers' | 'contacts', file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ImportResult>(`/import-export/import/${entity}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export function useImportCustomers() {
  return useMutation({ mutationFn: (file: File) => importEntity('customers', file) });
}

export function useImportContacts() {
  return useMutation({ mutationFn: (file: File) => importEntity('contacts', file) });
}

export function getExportUrl(entity: 'customers' | 'contacts'): string {
  const base = (import.meta.env.VITE_API_URL ?? '') as string;
  return `${base}/import-export/export?entity=${entity}`;
}
