import { useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem,
  Select, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TablePagination, Tooltip, Typography, IconButton, Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTasks, useCompleteTask, useCancelTask, type TaskStatus, type TaskType } from '../../api/tasks.api';
import TaskFormDialog from './TaskFormDialog';
import type { Task } from '../../shared/types/api.types';
import EmptyState from '../../shared/components/EmptyState';

const STATUS_COLORS: Record<TaskStatus, 'default' | 'warning' | 'success' | 'error'> = {
  OPEN: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

const TYPE_LABELS: Record<TaskType, string> = {
  FOLLOW_UP: 'Follow-up',
  CALL: 'Call',
  MEETING: 'Meeting',
  EMAIL: 'Email',
  INTERNAL_ACTION: 'Internal',
};

export default function TaskListPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>(undefined);

  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();

  const { data, isLoading } = useTasks({
    page: page + 1,
    pageSize,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    overdue: overdueOnly || undefined,
  });

  const handleComplete = async (id: string) => {
    await completeTask.mutateAsync(id);
  };

  const handleCancel = async (id: string) => {
    await cancelTask.mutateAsync(id);
  };

  return (
    <Box sx={{p: 2}} >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Tasks</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditTask(undefined); setDialogOpen(true); }}>
          New Task
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="OPEN">Open</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TaskType | '')}>
            <MenuItem value="">All types</MenuItem>
            <MenuItem value="FOLLOW_UP">Follow-up</MenuItem>
            <MenuItem value="CALL">Call</MenuItem>
            <MenuItem value="MEETING">Meeting</MenuItem>
            <MenuItem value="EMAIL">Email</MenuItem>
            <MenuItem value="INTERNAL_ACTION">Internal Action</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant={overdueOnly ? 'contained' : 'outlined'}
          color="error"
          startIcon={<WarningAmberIcon />}
          onClick={() => setOverdueOnly((v) => !v)}
          size="small"
        >
          Overdue Only
        </Button>
      </Stack>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data?.map((task) => (
                <TableRow
                  key={task.id}
                  sx={{ bgcolor: task.isOverdue ? 'error.50' : undefined }}
                >
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Tooltip title={task.title}>
                      <Stack direction="row" sx={{ alignItems: 'center' }} spacing={0.5}>
                        {task.isOverdue && <WarningAmberIcon sx={{ fontSize: 16, color: 'error.main', flexShrink: 0 }} />}
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => { setEditTask(task); setDialogOpen(true); }}
                        >
                          {task.title}
                        </Typography>
                      </Stack>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip label={TYPE_LABELS[task.type as TaskType] ?? task.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={task.status}
                      size="small"
                      color={STATUS_COLORS[task.status as TaskStatus] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <Typography variant="body2" color={task.isOverdue ? 'error' : 'text.primary'}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {task.assignee
                      ? `${task.assignee.firstName} ${task.assignee.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell>{(task as { customer?: { companyName: string } }).customer?.companyName ?? '—'}</TableCell>
                  <TableCell align="right">
                    {task.status === 'OPEN' && (
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Tooltip title="Complete">
                          <IconButton size="small" color="success" onClick={() => handleComplete(task.id)}>
                            <CheckCircleOutlineIcon sx={{fontSize: "small"}} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton size="small" color="error" onClick={() => handleCancel(task.id)}>
                            <CancelOutlinedIcon sx={{fontSize: "small"}} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ border: 0 }}>
                    <EmptyState
                      title="No tasks found"
                      description="Try clearing filters or create a new task"
                      action={{ label: 'New Task', onClick: () => { setEditTask(undefined); setDialogOpen(true); } }}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={data?.meta?.total ?? 0}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </Paper>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={editTask}
        onSuccess={() => setDialogOpen(false)}
      />
    </Box>
  );
}
