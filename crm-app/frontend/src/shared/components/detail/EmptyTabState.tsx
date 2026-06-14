import { Box, Button, Typography } from '@mui/material';

interface EmptyTabStateProps {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyTabState({ icon, message, actionLabel, onAction }: EmptyTabStateProps) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Box sx={{ fontSize: 48, color: 'text.disabled', mb: 1, lineHeight: 1 }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary">{message}</Typography>
      {actionLabel && onAction && (
        <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
