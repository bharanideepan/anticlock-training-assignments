import { useState } from 'react';
import {
  Avatar, Box, Divider, IconButton, ListItemIcon, Menu, MenuItem, Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

interface UserAvatarMenuProps {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: { name: string };
  } | null;
  onLogout: () => void;
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = (firstName ?? '').charAt(0).toUpperCase();
  const l = (lastName ?? '').charAt(0).toUpperCase();
  return f + l || '?';
}

export default function UserAvatarMenu({ user, onLogout }: UserAvatarMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const initials = getInitials(user?.firstName, user?.lastName);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User';

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
        <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: 'primary.main' }}>
          {initials}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { minWidth: 200, mt: 0.5 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{fullName}</Typography>
          {user?.role?.name && (
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {user.role.name.replace(/_/g, ' ')}
            </Typography>
          )}
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); onLogout(); }} sx={{ mt: 0.5 }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <Typography variant="body2">Sign out</Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
