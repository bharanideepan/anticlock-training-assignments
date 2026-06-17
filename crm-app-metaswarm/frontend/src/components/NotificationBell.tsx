import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import { useUnreadCount } from '../api/notifications';

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <Tooltip title="Notifications">
      <IconButton color="inherit" onClick={() => navigate('/notifications')}>
        <Badge badgeContent={unreadCount > 99 ? '99+' : unreadCount || undefined} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
