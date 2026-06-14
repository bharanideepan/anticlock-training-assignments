import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, IconButton, MenuItem,
  Paper, Select, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { useCustomers, useArchiveCustomer, useUnarchiveCustomer } from '../../api/customers.api';
import type { CustomerStatus } from '../../shared/types/api.types';
import { useAuth } from '../../shared/hooks/useAuth';
import EmptyState from '../../shared/components/EmptyState';

const STATUS_COLORS: Record<CustomerStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PROSPECT: 'info',
  ACTIVE: 'success',
  INACTIVE: 'warning',
  ARCHIVED: 'default',
};

export default function CustomerListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE'].includes(user?.role?.name ?? '');
  const canArchive = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER'].includes(user?.role?.name ?? '');
  const isAdmin = user?.role?.name === 'SYSTEM_ADMINISTRATOR';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');

  const { data, isLoading } = useCustomers({
    page: page + 1,
    pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const archive = useArchiveCustomer();
  const unarchive = useUnarchiveCustomer();

  return (
    <Box sx={{p: 2}} >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Customers</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/customers/new')}>
            Add customer
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={2} sx={{mb: 2}} >
        <TextField
          size="small" placeholder="Search company name…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 280 }}
        />
        <Select
          size="small" value={statusFilter} displayEmpty
          onChange={(e) => { setStatusFilter(e.target.value as CustomerStatus | ''); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="PROSPECT">Prospect</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="INACTIVE">Inactive</MenuItem>
          <MenuItem value="ARCHIVED">Archived</MenuItem>
        </Select>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Industry</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>City</TableCell>
              {(canArchive || isAdmin) && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : !data?.data?.length ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ border: 0 }}>
                  <EmptyState
                    title="No customers found"
                    description="Try adjusting your search or filters"
                    action={canCreate ? { label: 'Add customer', onClick: () => navigate('/customers/new') } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : data.data.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Tooltip title={c.companyName}>
                    <Button size="small" onClick={() => navigate(`/customers/${c.id}`)} sx={{ textTransform: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {c.companyName}
                    </Button>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 140 }}>
                  <Typography variant="body2" noWrap>{c.industry ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={c.status} size="small" color={STATUS_COLORS[c.status]} />
                </TableCell>
                <TableCell sx={{ maxWidth: 140 }}>
                  <Tooltip title={c.owner ? `${c.owner.firstName} ${c.owner.lastName}` : ''} disableHoverListener={!c.owner}>
                    <Typography variant="body2" noWrap>{c.owner ? `${c.owner.firstName} ${c.owner.lastName}` : '—'}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 120 }}>
                  <Typography variant="body2" noWrap>{c.city ?? '—'}</Typography>
                </TableCell>
                {(canArchive || isAdmin) && (
                  <TableCell align="right">
                    {c.status !== 'ARCHIVED' && canArchive && (
                      <Tooltip title="Archive">
                        <IconButton size="small" onClick={() => archive.mutate(c.id)}>
                          <ArchiveIcon sx={{fontSize: "small"}} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {c.status === 'ARCHIVED' && isAdmin && (
                      <Tooltip title="Unarchive">
                        <IconButton size="small" onClick={() => unarchive.mutate(c.id)}>
                          <UnarchiveIcon sx={{fontSize: "small"}} />
                        </IconButton>
                      </Tooltip>
                    )}
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
