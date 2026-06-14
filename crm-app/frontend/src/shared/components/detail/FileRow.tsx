import { Box, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

interface FileRowProps {
  file: {
    id: string;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
    uploadedBy?: { firstName: string; lastName: string };
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileRow({ file }: FileRowProps) {
  const name =
    file.originalName.length > 40
      ? file.originalName.slice(0, 40) + '…'
      : file.originalName;

  return (
    <ListItem divider>
      <ListItemIcon sx={{ minWidth: 36 }}>
        <InsertDriveFileIcon color="action" fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={<Typography variant="body2" fontWeight={500}>{name}</Typography>}
        secondary={
          file.uploadedBy
            ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`
            : undefined
        }
        secondaryTypographyProps={{ variant: 'caption' }}
      />
      <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {formatSize(file.sizeBytes)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(file.createdAt).toLocaleDateString()}
        </Typography>
      </Box>
    </ListItem>
  );
}
