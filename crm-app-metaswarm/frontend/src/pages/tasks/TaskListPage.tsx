import { useState, useCallback } from 'react';
import {
  Box, Button, Chip, CircularProgress, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../api/tasks';
import type { TaskStatus, TaskType } from '../../api/tasks';

const TYPE_COLOR: Record<TaskType, 'default' | 'primary' | 'success' | 'info' | 'warning'> = {
  FOLLOW_UP: 'warning',
  CALL: 'primary',
  MEETING: 'success',
  EMAIL: 'info',
  INTERNAL_ACTION: 'default',
};

const STATUS_COLOR: Record<TaskStatus, 'default' | 'success' | 'error'> = {
  OPEN: 'default',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const WRITE_ROLES = [
  'SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SUPPORT_REPRESENTATIVE',
];

export default function TaskListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = WRITE_ROLES.includes(user?.role ?? '');

  const [params, setParams] = useState<Record<string, string>>({});
  const { data, isLoading } = useTasks(Object.keys(params).length ? params : undefined);

  const handleStatusChange = useCallback((e: { target: { value: string } }) => {
    const val = e.target.value as TaskStatus | '';
    setParams((prev) => {
      const next = { ...prev };
      if (val) { next['status'] = val; } else { delete next['status']; }
      return next;
    });
  }, []);

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>Tasks</Typography>
        {canCreate && (
          <Button variant="contained" onClick={() => navigate('/tasks/new')}>
            New Task
          </Button>
        )}
      </Box>

      <Box mb={2}>
        <Select
          size="small"
          displayEmpty
          value={params['status'] ?? ''}
          onChange={handleStatusChange}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </Select>
      </Box>

      {isLoading && <CircularProgress />}

      {!isLoading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Overdue</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.data ?? []).map((t) => (
                <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.id}`)}>
                  <TableCell>
                    <Chip label={t.type.replace('_', ' ')} color={TYPE_COLOR[t.type]} size="small" />
                  </TableCell>
                  <TableCell>{t.title}</TableCell>
                  <TableCell>
                    <Chip label={t.status} color={STATUS_COLOR[t.status]} size="small" />
                  </TableCell>
                  <TableCell>{t.assignee.firstName} {t.assignee.lastName}</TableCell>
                  <TableCell>{new Date(t.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>{t.isOverdue ? <Chip label="Overdue" color="error" size="small" /> : '—'}</TableCell>
                </TableRow>
              ))}
              {(data?.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No tasks found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data && (
        <Typography variant="body2" color="text.secondary" mt={1}>
          {data.meta.total} total task{data.meta.total !== 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
}
