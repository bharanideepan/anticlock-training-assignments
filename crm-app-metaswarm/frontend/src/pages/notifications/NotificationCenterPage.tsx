import {
  Box, Button, Chip, CircularProgress, List, ListItem, ListItemText,
  Paper, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '../../api/notifications';
import type { NotificationType } from '../../api/notifications';

const TYPE_LABEL: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'Task Assigned',
  OPPORTUNITY_ASSIGNED: 'Opportunity Assigned',
  DUE_DATE_REMINDER: 'Due Date Reminder',
  OVERDUE_TASK: 'Overdue Task',
  CUSTOMER_UPDATED: 'Customer Updated',
};

const RESOURCE_ROUTE: Record<string, string> = {
  Task: '/tasks',
  Opportunity: '/opportunities',
  Customer: '/customers',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const handleClick = (id: string, resourceType?: string | null, resourceId?: string | null) => {
    if (!markRead.isPending) {
      markRead.mutate(id);
    }
    if (resourceType && resourceId) {
      const base = RESOURCE_ROUTE[resourceType];
      if (base) navigate(`${base}/${resourceId}`);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>Notifications</Typography>
        <Button
          variant="outlined" size="small"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending || !data?.meta.unreadCount}
        >
          Mark all as read
        </Button>
      </Box>

      {data?.meta && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {data.meta.unreadCount} unread of {data.meta.total} total
        </Typography>
      )}

      {isLoading && <CircularProgress />}

      {!isLoading && (
        <Paper variant="outlined">
          <List disablePadding>
            {(data?.data ?? []).length === 0 && (
              <ListItem>
                <ListItemText primary="No notifications" />
              </ListItem>
            )}
            {(data?.data ?? []).map((n, idx) => (
              <ListItem
                key={n.id}
                divider={idx < (data?.data.length ?? 0) - 1}
                sx={{
                  cursor: 'pointer',
                  bgcolor: n.isRead ? 'transparent' : 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
                onClick={() => handleClick(n.id, n.resourceType, n.resourceId)}
              >
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Chip label={TYPE_LABEL[n.type]} size="small" variant="outlined" />
                    <Typography variant="caption" color="text.secondary">{timeAgo(n.createdAt)}</Typography>
                    {!n.isRead && <Chip label="New" size="small" color="primary" />}
                  </Box>
                  <Typography variant="body2" fontWeight={n.isRead ? 400 : 600}>{n.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{n.body}</Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}
