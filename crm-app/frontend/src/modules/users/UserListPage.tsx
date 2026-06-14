import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, IconButton, MenuItem,
  Paper, Select, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useUsers, useDeactivateUser, useReactivateUser, useResetUserPassword } from '../../api/users.api';
import { useAuth } from '../../shared/hooks/useAuth';
import EmptyState from '../../shared/components/EmptyState';

const STATUS_COLORS: Record<string, 'success' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

export default function UserListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'SYSTEM_ADMINISTRATOR';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useUsers({ page: page + 1, pageSize, search: search || undefined, status: statusFilter || undefined });

  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const resetPwd = useResetUserPassword();

  return (
    <Box sx={{p: 2}} >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Users</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/users/new')}>
            Add user
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={2} sx={{mb: 2}} >
        <TextField
          size="small" placeholder="Search by name or email" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 300 }}
        />
        <Select
          size="small" value={statusFilter} displayEmpty
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="INACTIVE">Inactive</MenuItem>
        </Select>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Teams</TableCell>
              <TableCell>Status</TableCell>
              {isAdmin && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : !data?.data?.length ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ border: 0 }}>
                  <EmptyState title="No users found" description="Try adjusting your search or filters" />
                </TableCell>
              </TableRow>
            ) : data.data.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell sx={{ maxWidth: 180 }}>
                  <Tooltip title={`${u.firstName} ${u.lastName}`}>
                    <Button size="small" onClick={() => navigate(`/users/${u.id}`)} sx={{ textTransform: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {u.firstName} {u.lastName}
                    </Button>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Tooltip title={u.email}>
                    <Typography variant="body2" noWrap>{u.email}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip label={u.role?.name?.replace('_', ' ')} size="small" />
                </TableCell>
                <TableCell sx={{ maxWidth: 160 }}>
                  <Tooltip title={u.teams?.map((t) => t.name).join(', ') ?? ''} disableHoverListener={!u.teams?.length}>
                    <Typography variant="body2" noWrap>{u.teams?.map((t) => t.name).join(', ') || '—'}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip label={u.status} size="small" color={STATUS_COLORS[u.status] ?? 'default'} />
                </TableCell>
                {isAdmin && (
                  <TableCell align="right">
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/users/${u.id}/edit`)}><EditIcon sx={{fontSize: "small"}} /></IconButton></Tooltip>
                    {u.status === 'ACTIVE' ? (
                      <Tooltip title="Deactivate"><IconButton size="small" onClick={() => deactivate.mutate(u.id)}><PersonOffIcon sx={{fontSize: "small"}} /></IconButton></Tooltip>
                    ) : (
                      <Tooltip title="Reactivate"><IconButton size="small" onClick={() => reactivate.mutate(u.id)}><PersonIcon sx={{fontSize: "small"}} /></IconButton></Tooltip>
                    )}
                    <Tooltip title="Reset password"><IconButton size="small" onClick={() => resetPwd.mutate(u.id)}><LockResetIcon sx={{fontSize: "small"}} /></IconButton></Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={data?.meta?.total ?? 0}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
        rowsPerPageOptions={[10, 20, 50]}
      />
    </Box>
  );
}
