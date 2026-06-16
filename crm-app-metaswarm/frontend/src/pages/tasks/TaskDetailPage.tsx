import {
  Box, Button, Chip, CircularProgress, Divider, Grid, Paper, Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTask, useCompleteTask, useCancelTask, useDeleteTask } from '../../api/tasks';
import type { TaskType, TaskStatus } from '../../api/tasks';

const TYPE_LABEL: Record<TaskType, string> = {
  FOLLOW_UP: 'Follow Up',
  CALL: 'Call',
  MEETING: 'Meeting',
  EMAIL: 'Email',
  INTERNAL_ACTION: 'Internal Action',
};

const STATUS_COLOR: Record<TaskStatus, 'default' | 'success' | 'error'> = {
  OPEN: 'default',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box mb={1}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value ?? '—'}</Typography>
    </Box>
  );
}

export default function TaskDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
  const isManager = user?.role === 'SALES_MANAGER';

  const { data: task, isLoading } = useTask(id);
  const completeMutation = useCompleteTask();
  const cancelMutation = useCancelTask();
  const deleteMutation = useDeleteTask();

  const isCreator = task?.createdById === user?.id;
  const isAssignee = task?.assigneeId === user?.id;
  const canWrite = isAdmin || isManager || isCreator || isAssignee;
  const isOpen = task?.status === 'OPEN';

  if (isLoading) return <CircularProgress />;
  if (!task) return null;

  const handleComplete = () => {
    completeMutation.mutate(id, { onSuccess: () => void 0 });
  };

  const handleCancel = () => {
    cancelMutation.mutate(id, { onSuccess: () => void 0 });
  };

  const handleDelete = () => {
    deleteMutation.mutate(id, { onSuccess: () => navigate('/tasks') });
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Box display="flex" gap={1} mb={1}>
            <Chip label={TYPE_LABEL[task.type]} color="primary" size="small" />
            <Chip label={task.status} color={STATUS_COLOR[task.status]} size="small" />
            {task.isOverdue && <Chip label="Overdue" color="error" size="small" />}
          </Box>
          <Typography variant="h5" fontWeight={600}>{task.title}</Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          {canWrite && (
            <Button component={Link} to={`/tasks/${id}/edit`} variant="outlined" size="small">Edit</Button>
          )}
          {canWrite && isOpen && (
            <Button
              variant="contained" color="success" size="small"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              Complete
            </Button>
          )}
          {canWrite && isOpen && (
            <Button
              variant="outlined" color="warning" size="small"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              Cancel
            </Button>
          )}
          {canWrite && (
            <Button
              variant="outlined" color="error" size="small"
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
            <Field label="Description" value={task.description} />
            <Field label="Due Date" value={new Date(task.dueDate).toLocaleDateString()} />
            {task.completedAt && (
              <Field label="Completed At" value={new Date(task.completedAt).toLocaleString()} />
            )}
            {task.cancelledAt && (
              <Field label="Cancelled At" value={new Date(task.cancelledAt).toLocaleString()} />
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary">Assignee</Typography>
              <Typography variant="body1">{task.assignee.firstName} {task.assignee.lastName}</Typography>
            </Box>
            <Field label="Created By" value={`${task.createdBy.firstName} ${task.createdBy.lastName}`} />
            {task.customer && (
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">Customer</Typography>
                <Typography variant="body1">
                  <Link to={`/customers/${task.customerId ?? ''}`}>{task.customer.companyName}</Link>
                </Typography>
              </Box>
            )}
            {task.opportunity && (
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">Opportunity</Typography>
                <Typography variant="body1">
                  <Link to={`/opportunities/${task.opportunityId ?? ''}`}>{task.opportunity.name}</Link>
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
