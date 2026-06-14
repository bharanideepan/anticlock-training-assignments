import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { FileRecord, ApiResponse } from '../shared/types/api.types';

export type ResourceType = 'CUSTOMER' | 'OPPORTUNITY' | 'ACTIVITY';

export interface UploadUrlRequest {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  resourceType: ResourceType;
  resourceId: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  uploadFields: Record<string, string>;
  fileId: string;
  expiresAt: string;
}

export function useFiles(resourceType: ResourceType, resourceId: string, enabled = true) {
  return useQuery({
    queryKey: ['files', resourceType, resourceId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<FileRecord[]>>('/files', {
        params: { resourceType, resourceId },
      });
      return data.data;
    },
    enabled: enabled && !!resourceId,
  });
}

export function useRequestUploadUrl() {
  return useMutation({
    mutationFn: async (payload: UploadUrlRequest) => {
      const { data } = await apiClient.post<ApiResponse<UploadUrlResponse>>('/files/upload-url', payload);
      return data.data;
    },
  });
}

export function useConfirmUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId }: { fileId: string; resourceType: ResourceType; resourceId: string }) => {
      const { data } = await apiClient.post<ApiResponse<FileRecord>>('/files/confirm', { fileId });
      return data.data;
    },
    onSuccess: (_, { resourceType, resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ['files', resourceType, resourceId] });
    },
  });
}

export function useFileDownloadUrl() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.get<ApiResponse<{ downloadUrl: string; expiresAt: string }>>(`/files/${id}/download-url`);
      return data.data;
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/files/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
