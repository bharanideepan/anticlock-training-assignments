import {
  Box, Button, Chip, CircularProgress, Divider, Grid, Paper, Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useActivity, useDeleteActivity } from '../../api/activities';
import type { ActivityType } from '../../api/activities';

const TYPE_LABEL: Record<ActivityType, string> = {
  PHONE_CALL: 'Phone Call',
  MEETING: 'Meeting',
  EMAIL: 'Email',
  NOTE: 'Note',
  FOLLOW_UP: 'Follow Up',
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box mb={1}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value ?? '—'}</Typography>
    </Box>
  );
}

export default function ActivityDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
  const canEdit = isAdmin || user?.role === 'SALES_MANAGER' || user?.role === 'SALES_REPRESENTATIVE' || user?.role === 'SUPPORT_REPRESENTATIVE';

  const { data: activity, isLoading } = useActivity(id);
  const deleteMutation = useDeleteActivity(id);

  const isCreator = activity?.createdById === user?.id;
  const canDelete = isAdmin || isCreator;

  if (isLoading) return <CircularProgress />;
  if (!activity) return null;

  const handleDelete = () => {
    deleteMutation.mutate(undefined, { onSuccess: () => navigate('/activities') });
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Chip label={TYPE_LABEL[activity.type]} color="primary" size="small" sx={{ mb: 1 }} />
          <Typography variant="h5" fontWeight={600}>{activity.subject}</Typography>
        </Box>
        <Box display="flex" gap={1}>
          {canEdit && isCreator && (
            <Button component={Link} to={`/activities/${id}/edit`} variant="outlined">Edit</Button>
          )}
          {canDelete && (
            <Button
              variant="outlined" color="error"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Field label="Description" value={activity.description} />
            <Field label="Duration" value={activity.durationMinutes ? `${activity.durationMinutes} min` : null} />
            <Field
              label="Scheduled At"
              value={activity.scheduledAt ? new Date(activity.scheduledAt).toLocaleString() : null}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary">Customer</Typography>
              <Typography variant="body1">
                <Link to={`/customers/${activity.customerId}`}>{activity.customer.companyName}</Link>
              </Typography>
            </Box>
            {activity.contact && (
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">Contact</Typography>
                <Typography variant="body1">
                  <Link to={`/contacts/${activity.contact.id}`}>
                    {activity.contact.firstName} {activity.contact.lastName}
                  </Link>
                </Typography>
              </Box>
            )}
            <Field
              label="Created By"
              value={`${activity.createdBy.firstName} ${activity.createdBy.lastName}`}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
