import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Divider, List, ListItem,
  ListItemText, Paper, Stack, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import {
  useUser, useDeactivateUser, useReactivateUser, useResetUserPassword,
} from '../../api/users.api';
import { useAuth } from '../../shared/hooks/useAuth';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role?.name === 'SYSTEM_ADMINISTRATOR';

  const { data: user, isLoading } = useUser(id!);
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const resetPwd = useResetUserPassword();

  if (isLoading) return <CircularProgress sx={{ m: 4 }} />;
  if (!user) return <Typography sx={{p: 2}} >User not found.</Typography>;

  return (
    <Box sx={{maxWidth: 700, p: 3}} >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5">{user.firstName} {user.lastName}</Typography>
          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {isAdmin && (
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/users/${id}/edit`)}>
              Edit
            </Button>
          )}
        </Stack>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{width: 120}}>Status</Typography>
            <Chip
              label={user.status}
              color={user.status === 'ACTIVE' ? 'success' : 'default'}
              size="small"
            />
          </Stack>
          <Divider />

          <Stack direction="row" spacing={2}>
            <Typography variant="subtitle2" color="text.secondary" sx={{width: 120}}>Role</Typography>
            <Chip label={user.role?.name?.replace(/_/g, ' ')} size="small" variant="outlined" />
          </Stack>

          {user.jobTitle && (
            <Stack direction="row" spacing={2}>
              <Typography variant="subtitle2" color="text.secondary" sx={{width: 120}}>Job title</Typography>
              <Typography>{user.jobTitle}</Typography>
            </Stack>
          )}

          {user.phone && (
            <Stack direction="row" spacing={2}>
              <Typography variant="subtitle2" color="text.secondary" sx={{width: 120}}>Phone</Typography>
              <Typography>{user.phone}</Typography>
            </Stack>
          )}

          <Divider />

          <Typography variant="subtitle2">Teams</Typography>
          {user.teams?.length ? (
            <List dense disablePadding>
              {user.teams.map((t) => (
                <ListItem key={t.id} disablePadding>
                  <ListItemText primary={t.name} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">No team assigned</Typography>
          )}
        </Stack>
      </Paper>

      {isAdmin && currentUser?.id !== id && (
        <Stack direction="row" spacing={2} sx={{mt: 3}} >
          {user.status === 'ACTIVE' ? (
            <Button
              variant="outlined" color="warning"
              onClick={() => deactivate.mutate(id!, { onSuccess: () => navigate('/users') })}
              disabled={deactivate.isPending}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="outlined" color="success"
              onClick={() => reactivate.mutate(id!)}
              disabled={reactivate.isPending}
            >
              Reactivate
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => resetPwd.mutate(id!)}
            disabled={resetPwd.isPending}
          >
            {resetPwd.isPending ? 'Sending…' : 'Reset password'}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
