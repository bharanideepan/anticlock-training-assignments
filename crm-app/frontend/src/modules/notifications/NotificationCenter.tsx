import {
  Box, Button, CircularProgress, Divider, List, ListItem, ListItemButton, ListItemText,
  Popover, Stack, Typography,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '../../api/notifications.api';
import type { Notification } from '../../shared/types/api.types';

const RESOURCE_PATHS: Record<string, string> = {
  TASK: '/tasks',
  CUSTOMER: '/customers',
  OPPORTUNITY: '/opportunities',
};

interface NotificationCenterProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export default function NotificationCenter({ anchorEl, onClose }: NotificationCenterProps) {
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications({ pageSize: 20 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const handleClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.resourceType && notification.resourceId) {
      const basePath = RESOURCE_PATHS[notification.resourceType];
      if (basePath) navigate(`${basePath}/${notification.resourceId}`);
    }
    onClose();
  };

  const handleMarkAll = async () => {
    await markAll.mutateAsync();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { width: 380, maxHeight: 520 } } }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" sx={{fontWeight: 600}} >Notifications</Typography>
        <Button size="small" startIcon={<DoneAllIcon />} onClick={handleMarkAll} disabled={markAll.isPending}>
          Mark all read
        </Button>
      </Stack>
      <Divider />

      {isLoading && <Box sx={{display: "flex", justifyContent: "center", p: 3}} ><CircularProgress size={24} /></Box>}

      {!isLoading && !data?.data?.length && (
        <Typography color="text.secondary" align="center" sx={{px: 2, py: 4}} >No notifications.</Typography>
      )}

      {!isLoading && !!data?.data?.length && (
        <List disablePadding sx={{ overflow: 'auto', maxHeight: 420 }}>
          {data?.data?.map((n) => (
            <Box key={n.id}>
              <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleClick(n)}
                sx={{ bgcolor: n.isRead ? undefined : 'action.hover', py: 1 }}
              >
                <ListItemText
                  primary={<Typography variant="body2">{n.title}</Typography>}
                  secondary={
                    <Stack spacing={0}>
                      <Typography variant="caption" color="text.secondary">{n.body}</Typography>
                      <Typography variant="caption" color="text.disabled">
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                  }
                  sx={{ fontWeight: n.isRead ? 400 : 600 }}
                />
              </ListItemButton>
              </ListItem>
              <Divider component="li" />
            </Box>
          ))}
        </List>
      )}
    </Popover>
  );
}
