import { useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOpportunities } from '../../api/opportunities';
import type { OpportunityQueryParams } from '../../api/opportunities';

const WRITE_ROLES = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE'];

function formatRevenue(val?: string): string {
  if (!val) return '—';
  return `$${parseFloat(val).toLocaleString()}`;
}

export default function OpportunityListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = WRITE_ROLES.includes(user?.role ?? '');

  const [params] = useState<OpportunityQueryParams>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useOpportunities(params);

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>Opportunities</Typography>
        {canCreate && (
          <Button variant="contained" onClick={() => navigate('/opportunities/new')}>
            New Opportunity
          </Button>
        )}
      </Box>

      {isLoading && <CircularProgress />}

      {!isLoading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Revenue</TableCell>
                <TableCell>Close Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.data ?? []).map((o) => (
                <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/opportunities/${o.id}`)}>
                  <TableCell>{o.name}</TableCell>
                  <TableCell>{o.customer.companyName}</TableCell>
                  <TableCell>
                    <Chip label={o.stage.name} size="small" color={o.stage.isTerminal ? 'default' : 'primary'} />
                  </TableCell>
                  <TableCell>{o.owner.firstName} {o.owner.lastName}</TableCell>
                  <TableCell>{formatRevenue(o.expectedRevenue)}</TableCell>
                  <TableCell>{o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
              {(data?.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No opportunities found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data && (
        <Typography variant="body2" color="text.secondary" mt={1}>
          {data.meta.total} total opportunit{data.meta.total !== 1 ? 'ies' : 'y'}
        </Typography>
      )}
    </Box>
  );
}
