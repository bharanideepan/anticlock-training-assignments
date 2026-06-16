import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCustomers } from '../../api/customers';
import type { CustomerQueryParams } from '../../api/customers';

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  PROSPECT: 'default',
  ACTIVE: 'success',
  INACTIVE: 'warning',
  ARCHIVED: 'error',
};

export default function CustomerListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE'].includes(
    user?.role ?? '',
  );

  const [params, setParams] = useState<CustomerQueryParams>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useCustomers(params);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }));
  }, []);

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>
          Customers
        </Typography>
        {canCreate && (
          <Button variant="contained" onClick={() => navigate('/customers/new')}>
            Create Customer
          </Button>
        )}
      </Box>

      <TextField
        placeholder="Search customers…"
        onChange={handleSearch}
        size="small"
        sx={{ mb: 2, width: 320 }}
      />

      {isLoading && <CircularProgress />}

      {!isLoading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Industry</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Owner</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.data ?? []).map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <TableCell>{c.companyName}</TableCell>
                  <TableCell>{c.industry ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={c.status}
                      color={STATUS_COLOR[c.status] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {c.owner.firstName} {c.owner.lastName}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No customers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data && (
        <Typography variant="body2" color="text.secondary" mt={1}>
          {data.meta.total} total customer{data.meta.total !== 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
}
