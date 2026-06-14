import { Box, Chip, ListItemButton, Typography } from '@mui/material';

interface ActivityRowProps {
  activity: {
    id: string;
    type: string;
    subject: string;
    description?: string;
    occurredAt?: string;
    scheduledAt?: string;
  };
  onClick: () => void;
}

export default function ActivityRow({ activity, onClick }: ActivityRowProps) {
  const dateStr = activity.occurredAt ?? activity.scheduledAt;
  const preview = activity.description
    ? activity.description.length > 80
      ? activity.description.slice(0, 80) + '…'
      : activity.description
    : undefined;

  return (
    <ListItemButton divider onClick={onClick}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
        <Chip
          label={activity.type.replace(/_/g, ' ')}
          size="small"
          variant="outlined"
          sx={{ flexShrink: 0, mt: 0.25 }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{activity.subject}</Typography>
          {preview && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {preview}
            </Typography>
          )}
        </Box>
        {dateStr && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {new Date(dateStr).toLocaleDateString()}
          </Typography>
        )}
      </Box>
    </ListItemButton>
  );
}
