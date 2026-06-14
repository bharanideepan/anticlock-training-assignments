import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useOpportunities } from '../../api/opportunities.api';
import { useAuth } from '../../shared/hooks/useAuth';
import EmptyState from '../../shared/components/EmptyState';

const OUTCOME_COLORS: Record<string, 'default' | 'success' | 'error'> = {
  WON: 'success',
  LOST: 'error',
};

export default function OpportunityListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE'].includes(user?.role?.name ?? '');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [includeTerminal, setIncludeTerminal] = useState(false);

  const { data, isLoading } = useOpportunities({
    page: page + 1, pageSize,
    search: search || undefined,
    includeTerminal,
  });

  return (
    <Box sx={{p: 2}} >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Opportunities</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/opportunities/new')}>
            Add opportunity
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
        <TextField
          size="small" placeholder="Search opportunities…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 280 }}
        />
        <Button
          size="small" variant={includeTerminal ? 'contained' : 'outlined'}
          onClick={() => setIncludeTerminal((v) => !v)}
        >
          {includeTerminal ? 'Active only' : 'Include Won/Lost'}
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell align="right">Probability</TableCell>
              <TableCell>Close date</TableCell>
              <TableCell>Owner</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : !data?.data?.length ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ border: 0 }}>
                  <EmptyState
                    title="No opportunities found"
                    description="Try adjusting your search or filters"
                    action={canCreate ? { label: 'Add opportunity', onClick: () => navigate('/opportunities/new') } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : data.data.map((opp) => (
              <TableRow key={opp.id} hover>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Tooltip title={opp.name}>
                    <Button size="small" onClick={() => navigate(`/opportunities/${opp.id}`)} sx={{ textTransform: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {opp.name}
                    </Button>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 160 }}>
                  <Tooltip title={(opp as { customer?: { companyName: string } }).customer?.companyName ?? ''} disableHoverListener={!(opp as { customer?: { companyName: string } }).customer?.companyName}>
                    <Typography variant="body2" noWrap>{(opp as { customer?: { companyName: string } }).customer?.companyName ?? '—'}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {opp.stage?.terminalOutcome ? (
                    <Chip label={opp.stage.name} size="small"
                      color={OUTCOME_COLORS[opp.stage.terminalOutcome] ?? 'default'} />
                  ) : (
                    <Chip label={opp.stage?.name ?? '—'} size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  {opp.expectedRevenue ? `$${Number(opp.expectedRevenue).toLocaleString()}` : '—'}
                </TableCell>
                <TableCell align="right">{opp.probability != null ? `${opp.probability}%` : '—'}</TableCell>
                <TableCell>
                  {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell>
                  {opp.owner ? `${opp.owner.firstName} ${opp.owner.lastName}` : '—'}
                </TableCell>
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
