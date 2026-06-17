import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const BASE = '/api/v1/files';

async function apiFetch<T>(path: string, token: string, options?: RequestInit, params?: Record<string, string>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${BASE}${path}${qs}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as { data?: T; error?: { code: string; message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  return json.data as T;
}

export type FileResourceType = 'CUSTOMER' | 'OPPORTUNITY' | 'ACTIVITY';

export interface FileRecord {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  resourceType: FileResourceType;
  resourceId: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  uploadFields: Record<string, string>;
  fileId: string;
  expiresAt: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
}

export function requestUploadUrl(token: string, data: {
  originalName: string; mimeType: string; sizeBytes: number;
  resourceType: FileResourceType; resourceId: string;
}): Promise<UploadUrlResponse> {
  return apiFetch<UploadUrlResponse>('/upload-url', token, { method: 'POST', body: JSON.stringify(data) });
}

export function confirmUpload(token: string, fileId: string): Promise<FileRecord> {
  return apiFetch<FileRecord>('/confirm', token, { method: 'POST', body: JSON.stringify({ fileId }) });
}

export function getDownloadUrl(token: string, id: string): Promise<DownloadUrlResponse> {
  return apiFetch<DownloadUrlResponse>(`/${id}/download-url`, token);
}

export function deleteFile(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/${id}`, token, { method: 'DELETE' });
}

export function useFiles(resourceType: FileResourceType, resourceId: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['files', resourceType, resourceId],
    queryFn: () => apiFetch<FileRecord[]>('', accessToken!, undefined, { resourceType, resourceId }),
    enabled: !!accessToken && !!resourceId,
  });
}

export function useUploadFile(resourceType: FileResourceType, resourceId: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl, uploadFields, fileId } = await requestUploadUrl(accessToken!, {
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        resourceType,
        resourceId,
      });

      const formData = new FormData();
      Object.entries(uploadFields).forEach(([k, v]) => formData.append(k, v));
      formData.append('file', file);

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('S3 upload failed');

      return confirmUpload(accessToken!, fileId);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['files', resourceType, resourceId] }); },
  });
}

export function useDeleteFile(resourceType: FileResourceType, resourceId: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFile(accessToken!, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['files', resourceType, resourceId] }); },
  });
}
