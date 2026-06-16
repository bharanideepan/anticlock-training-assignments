import { useState, useCallback } from 'react';
import {
  Box, Button, CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useContacts } from '../../api/contacts';
import type { ContactQueryParams } from '../../api/contacts';

const WRITE_ROLES = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SUPPORT_REPRESENTATIVE'];

export default function ContactListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = WRITE_ROLES.includes(user?.role ?? '');

  const [params, setParams] = useState<ContactQueryParams>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useContacts(params);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }));
  }, []);

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>Contacts</Typography>
        {canCreate && (
          <Button variant="contained" onClick={() => navigate('/contacts/new')}>
            New Contact
          </Button>
        )}
      </Box>

      <TextField placeholder="Search contacts…" onChange={handleSearch} size="small" sx={{ mb: 2, width: 320 }} />

      {isLoading && <CircularProgress />}

      {!isLoading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Designation</TableCell>
                <TableCell>Company</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.data ?? []).map((c) => (
                <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/contacts/${c.id}`)}>
                  <TableCell>{c.firstName} {c.lastName}</TableCell>
                  <TableCell>{c.email ?? '—'}</TableCell>
                  <TableCell>{c.phone ?? '—'}</TableCell>
                  <TableCell>{c.designation ?? '—'}</TableCell>
                  <TableCell>{c.customer.companyName}</TableCell>
                </TableRow>
              ))}
              {(data?.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No contacts found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data && (
        <Typography variant="body2" color="text.secondary" mt={1}>
          {data.meta.total} total contact{data.meta.total !== 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
}
