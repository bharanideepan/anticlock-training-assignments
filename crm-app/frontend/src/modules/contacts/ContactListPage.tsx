import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, CircularProgress, IconButton, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useContacts, useDeleteContact } from '../../api/contacts.api';
import { useAuth } from '../../shared/hooks/useAuth';
import EmptyState from '../../shared/components/EmptyState';

export default function ContactListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SUPPORT_REPRESENTATIVE'].includes(user?.role?.name ?? '');
  const canDelete = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER'].includes(user?.role?.name ?? '');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useContacts({ page: page + 1, pageSize, search: search || undefined });
  const deleteMutation = useDeleteContact();

  return (
    <Box sx={{p: 2}} >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Contacts</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contacts/new')}>
            Add contact
          </Button>
        )}
      </Stack>

      <TextField
        size="small" placeholder="Search by name or email…" value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        sx={{ mb: 2, width: 300 }}
      />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Designation</TableCell>
              {canDelete && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : !data?.data?.length ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ border: 0 }}>
                  <EmptyState
                    title="No contacts found"
                    description="Try adjusting your search or add a new contact"
                    action={canCreate ? { label: 'Add contact', onClick: () => navigate('/contacts/new') } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : data.data.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ maxWidth: 180 }}>
                  <Tooltip title={`${c.firstName} ${c.lastName}`}>
                    <Button size="small" onClick={() => navigate(`/contacts/${c.id}`)} sx={{ textTransform: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {c.firstName} {c.lastName}
                    </Button>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Tooltip title={c.email ?? ''} disableHoverListener={!c.email}>
                    <Typography variant="body2" noWrap>{c.email ?? '—'}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 160 }}>
                  <Tooltip title={(c as { customer?: { companyName: string } }).customer?.companyName ?? ''} disableHoverListener={!(c as { customer?: { companyName: string } }).customer?.companyName}>
                    <Typography variant="body2" noWrap>{(c as { customer?: { companyName: string } }).customer?.companyName ?? '—'}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 140 }}>
                  <Typography variant="body2" noWrap>{c.designation ?? '—'}</Typography>
                </TableCell>
                {canDelete && (
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => deleteMutation.mutate(c.id)}>
                        <DeleteIcon sx={{fontSize: "small"}} />
                      </IconButton>
                    </Tooltip>
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
