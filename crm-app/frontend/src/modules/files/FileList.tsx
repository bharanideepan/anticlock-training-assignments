import {
  Box, CircularProgress, IconButton, List, ListItem, ListItemText,
  Tooltip, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useFiles, useFileDownloadUrl, useDeleteFile, type ResourceType } from '../../api/files.api';

interface FileListProps {
  resourceType: ResourceType;
  resourceId: string;
  canDelete?: boolean;
}

function formatBytes(bytes: number | bigint) {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileList({ resourceType, resourceId, canDelete = false }: FileListProps) {
  const { data: files, isLoading } = useFiles(resourceType, resourceId);
  const getDownloadUrl = useFileDownloadUrl();
  const deleteFile = useDeleteFile();

  const handleDownload = async (id: string) => {
    const result = await getDownloadUrl.mutateAsync(id);
    window.open(result.downloadUrl, '_blank');
  };

  if (isLoading) return <CircularProgress size={24} />;
  if (!files?.length) return <Typography color="text.secondary" sx={{py: 2}} >No files attached.</Typography>;

  return (
    <List dense>
      {files.map((file) => (
        <ListItem
 key={file.id}
 secondaryAction={
 <Box>
 <Tooltip title="Download">
 <IconButton size="small" onClick={() => handleDownload(file.id)}>
 <DownloadIcon />
 </IconButton>
 </Tooltip>
 {canDelete && (
 <Tooltip title="Delete">
 <IconButton size="small" color="error" onClick={() => deleteFile.mutate(file.id)}>
 <DeleteIcon fontSize="small" />
 </IconButton>
 </Tooltip>
 )}
 </Box>
 } sx={{fontSize: "small"}}
 >
          <InsertDriveFileIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
          <ListItemText
            primary={file.originalName}
            secondary={`${formatBytes(file.sizeBytes)} · Uploaded by ${file.uploadedBy.firstName} ${file.uploadedBy.lastName} · ${new Date(file.createdAt).toLocaleDateString()}`}
          />
        </ListItem>
      ))}
    </List>
  );
}
