import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser, useDeactivateUser, useReactivateUser, useResetUserPassword } from '../../api/users';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: viewer } = useAuth();
  const isAdmin = viewer?.role === 'SYSTEM_ADMINISTRATOR';

  const { data: user, isLoading } = useUser(id ?? '');
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const resetPassword = useResetUserPassword();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return null;

  const isActive = user.status === 'ACTIVE';

  return (
    <Box p={3} maxWidth={700}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {`${user.firstName} ${user.lastName}`}
          </Typography>
          <Typography color="text.secondary">{user.email}</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          {isAdmin && (
            <Button component={Link} to={`/users/${user.id}/edit`} variant="outlined" size="small">
              Edit User
            </Button>
          )}
        </Box>
      </Box>

      <Stack spacing={3}>
        {/* Profile section */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Profile
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1}>
            {user.phone && (
              <Box>
                <Typography variant="caption" color="text.secondary">Phone</Typography>
                <Typography>{user.phone}</Typography>
              </Box>
            )}
            {user.jobTitle && (
              <Box>
                <Typography variant="caption" color="text.secondary">Job Title</Typography>
                <Typography>{user.jobTitle}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box mt={0.5}>
                <Chip
                  label={user.status}
                  size="small"
                  color={isActive ? 'success' : 'default'}
                />
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* Role section */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Role
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography>{user.role.name}</Typography>
        </Box>

        {/* Teams section */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Teams
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {user.teams.length === 0 ? (
            <Typography color="text.secondary">No team assignments</Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {user.teams.map((team) => (
                <Chip key={team.id} label={team.name} size="small" />
              ))}
            </Stack>
          )}
        </Box>

        {/* Admin actions */}
        {isAdmin && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              Admin Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={2}>
              {isActive ? (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => deactivate.mutate(user.id)}
                  disabled={deactivate.isPending}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => reactivate.mutate(user.id)}
                  disabled={reactivate.isPending}
                >
                  Reactivate
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={() => resetPassword.mutate(user.id)}
                disabled={resetPassword.isPending}
              >
                Reset Password
              </Button>
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
