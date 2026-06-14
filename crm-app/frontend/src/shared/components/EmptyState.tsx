import { Box, Button, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
        textAlign: 'center',
        color: 'text.disabled',
      }}
    >
      <Box sx={{ fontSize: 48, mb: 1.5, opacity: 0.4, display: 'flex' }}>
        {icon ?? <InboxIcon fontSize="inherit" />}
      </Box>
      <Typography variant="body1" fontWeight={600} color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      {action && (
        <Button variant="contained" size="small" onClick={action.onClick} sx={{ mt: description ? 0 : 1.5 }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
