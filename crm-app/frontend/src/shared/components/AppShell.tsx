import { useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ContactsIcon from '@mui/icons-material/Contacts';
import WorkIcon from '@mui/icons-material/Work';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import LocalActivityIcon from '@mui/icons-material/LocalActivity';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import GlobalSearchBar from '../../modules/search/GlobalSearchBar';
import NotificationBell from '../../modules/notifications/NotificationBell';
import UserAvatarMenu from './UserAvatarMenu';

const DRAWER_WIDTH = 168;

const SIDEBAR_BG = '#1e293b';
const NAV_COLOR_INACTIVE = '#94a3b8';
const NAV_COLOR_ACTIVE = '#ffffff';

const NAV_ITEM_SX = {
  color: NAV_COLOR_INACTIVE,
  borderRadius: 1,
  mx: 0.5,
  '& .MuiListItemIcon-root': { color: NAV_COLOR_INACTIVE },
  '&.Mui-selected': {
    bgcolor: 'rgba(25,118,210,0.18)',
    color: NAV_COLOR_ACTIVE,
    '& .MuiListItemIcon-root': { color: NAV_COLOR_ACTIVE },
    '&:hover': { bgcolor: 'rgba(25,118,210,0.26)' },
  },
  '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
};

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Customers', path: '/customers', icon: <PeopleIcon fontSize="small" /> },
  { label: 'Contacts', path: '/contacts', icon: <ContactsIcon fontSize="small" /> },
  { label: 'Opportunities', path: '/opportunities', icon: <WorkIcon fontSize="small" /> },
  { label: 'Pipeline', path: '/pipeline', icon: <AccountTreeIcon fontSize="small" /> },
  { label: 'Tasks', path: '/tasks', icon: <AssignmentIcon fontSize="small" /> },
  { label: 'Activities', path: '/activities', icon: <LocalActivityIcon fontSize="small" /> },
  { label: 'Reports', path: '/reports', icon: <BarChartIcon fontSize="small" /> },
];

const ADMIN_ITEMS = [
  { label: 'Users', path: '/users', icon: <PeopleIcon fontSize="small" /> },
  { label: 'Audit Log', path: '/audit', icon: <SecurityIcon fontSize="small" /> },
  { label: 'Import/Export', path: '/import-export', icon: <CloudUploadIcon fontSize="small" /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon fontSize="small" /> },
];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('xl'));
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const isAdmin = user?.role?.name === 'SYSTEM_ADMINISTRATOR';
  const isManager = user?.role?.name === 'SALES_MANAGER';

  const drawerContent = (
    <Box sx={{ overflow: 'auto', pt: 0.5 }}>
      <List dense disablePadding>
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: 0.25 }}>
            <ListItemButton
              selected={location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))}
              onClick={() => { navigate(item.path); if (!isDesktop) setMobileOpen(false); }}
              sx={NAV_ITEM_SX}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { variant: 'body2', sx: { color: 'inherit', fontWeight: 500 } } }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {(isAdmin || isManager) && (
        <>
          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
          <List dense disablePadding>
            {ADMIN_ITEMS.filter((item) => {
              if (!isAdmin && item.path === '/audit') return false;
              if (!isAdmin && item.path === '/settings') return false;
              return true;
            }).map((item) => (
              <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: 0.25 }}>
                <ListItemButton
                  selected={location.pathname.startsWith(item.path)}
                  onClick={() => { navigate(item.path); if (!isDesktop) setMobileOpen(false); }}
                  sx={NAV_ITEM_SX}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { variant: 'body2', sx: { color: 'inherit', fontWeight: 500 } } }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar sx={{ zIndex: (t) => t.zIndex.drawer + 1, position: 'fixed' }} elevation={1} color="default">
        <Toolbar variant="dense">
          {!isDesktop && (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen((o) => !o)}
              sx={{ mr: 1 }}
              size="small"
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="subtitle2" sx={{ mr: 2, flexShrink: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
            CRM
          </Typography>
          <Box sx={{ flex: 1 }} />
          <GlobalSearchBar />
          <Box sx={{ ml: 1 }}>
            <NotificationBell />
          </Box>
          <Box sx={{ ml: 1 }}>
            <UserAvatarMenu user={user} onLogout={logout} />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Desktop: permanent drawer */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              top: '48px',
              height: 'calc(100% - 48px)',
              backgroundColor: SIDEBAR_BG,
              borderRight: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile: temporary overlay drawer */}
      {!isDesktop && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              backgroundColor: SIDEBAR_BG,
              borderRight: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '48px',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
