import { useState } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useUnreadCount } from '../../api/notifications.api';
import NotificationCenter from './NotificationCenter';

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Badge badgeContent={unreadCount || undefined} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <NotificationCenter anchorEl={anchorEl} onClose={() => setAnchorEl(null)} />
    </>
  );
}
