import { useRef, useState } from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from 'axios';
import { useRequestUploadUrl, useConfirmUpload, type ResourceType } from '../../api/files.api';

const MAX_SIZE = 25 * 1024 * 1024;

interface FileUploadZoneProps {
  resourceType: ResourceType;
  resourceId: string;
  onUploaded?: () => void;
}

export default function FileUploadZone({ resourceType, resourceId, onUploaded }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestUrl = useRequestUploadUrl();
  const confirmUpload = useConfirmUpload();

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_SIZE) {
      setError('File exceeds 25 MB limit.');
      return;
    }

    try {
      const { uploadUrl, fileId } = await requestUrl.mutateAsync({
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        resourceType,
        resourceId,
      });

      setProgress(0);
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      await confirmUpload.mutateAsync({ fileId, resourceType, resourceId });
      setProgress(null);
      onUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      setProgress(null);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
        onClick={() => inputRef.current?.click()}
      >
        <UploadFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">Click to select a file (max 25 MB)</Typography>
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </Box>
      {progress !== null && (
        <Stack spacing={0.5} sx={{mt: 1}} >
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption">{progress}%</Typography>
        </Stack>
      )}
      {error && <Typography variant="caption" color="error" sx={{mt: 1}} >{error}</Typography>}
    </Box>
  );
}
