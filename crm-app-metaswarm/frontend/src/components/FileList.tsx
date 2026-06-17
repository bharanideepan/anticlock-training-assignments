import { useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, IconButton, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useFiles, useUploadFile, useDeleteFile, getDownloadUrl } from '../api/files';
import type { FileResourceType } from '../api/files';
import { useAuth } from '../context/AuthContext';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  resourceType: FileResourceType;
  resourceId: string;
}

export function FileList({ resourceType, resourceId }: Props) {
  const { user, accessToken } = useAuth();
  const { data: files, isLoading } = useFiles(resourceType, resourceId);
  const uploadMutation = useUploadFile(resourceType, resourceId);
  const deleteMutation = useDeleteFile(resourceType, resourceId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const isAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
  const isManager = user?.role === 'SALES_MANAGER';
  const canWrite = isAdmin || isManager || user?.role === 'SALES_REPRESENTATIVE' || user?.role === 'SUPPORT_REPRESENTATIVE';

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (id: string, name: string) => {
    setDownloading(id);
    try {
      const { downloadUrl } = await getDownloadUrl(accessToken!, id);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = name;
      a.click();
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Box>
      {canWrite && (
        <Box mb={2}>
          <input ref={fileInputRef} type="file" hidden onChange={handleUpload} />
          <Button
            variant="outlined"
            startIcon={uploadMutation.isPending ? <CircularProgress size={16} /> : <UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            Upload File
          </Button>
          {uploadMutation.isError && (
            <Typography variant="caption" color="error" ml={2}>
              Upload failed. Please try again.
            </Typography>
          )}
        </Box>
      )}

      {isLoading && <CircularProgress />}

      {!isLoading && (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(files ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No files attached</TableCell>
                </TableRow>
              )}
              {(files ?? []).map((f) => {
                const canDelete = isAdmin || isManager || f.uploadedBy.id === user?.id;
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Tooltip title={f.originalName}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{f.originalName}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatBytes(f.sizeBytes)}</TableCell>
                    <TableCell>{f.uploadedBy.firstName} {f.uploadedBy.lastName}</TableCell>
                    <TableCell>{new Date(f.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => void handleDownload(f.id, f.originalName)}
                          disabled={downloading === f.id}
                        >
                          {downloading === f.id ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      {canDelete && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteMutation.mutate(f.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
