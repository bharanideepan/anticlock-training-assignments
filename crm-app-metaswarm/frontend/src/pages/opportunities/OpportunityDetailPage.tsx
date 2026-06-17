import {
  Box, Button, Chip, CircularProgress, Divider, Grid, Paper, Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOpportunity, useCloseWon, useCloseLost } from '../../api/opportunities';

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Box mb={1}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value ?? '—'}</Typography>
    </Box>
  );
}

export default function OpportunityDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
  const isManager = user?.role === 'SALES_MANAGER';
  const { data: opp, isLoading } = useOpportunity(id);
  const closeWonMutation = useCloseWon(id);
  const closeLostMutation = useCloseLost(id);

  const isOwner = opp?.ownerId === user?.id;
  const canWrite = isAdmin || isManager || isOwner;
  const isTerminal = opp?.stage.isTerminal ?? false;

  if (isLoading) return <CircularProgress />;
  if (!opp) return null;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Chip label={opp.stage.name} color={isTerminal ? 'default' : 'primary'} size="small" sx={{ mb: 1 }} />
          <Typography variant="h5" fontWeight={600}>{opp.name}</Typography>
        </Box>
        {canWrite && !isTerminal && (
          <Box display="flex" gap={1}>
            <Button component={Link} to={`/opportunities/${id}/edit`} variant="outlined">Edit</Button>
            <Button
              variant="contained" color="success"
              disabled={closeWonMutation.isPending}
              onClick={() => closeWonMutation.mutate(undefined, { onSuccess: () => navigate('/opportunities') })}
            >
              Close Won
            </Button>
            <Button
              variant="outlined" color="error"
              disabled={closeLostMutation.isPending}
              onClick={() => closeLostMutation.mutate(undefined, { onSuccess: () => navigate('/opportunities') })}
            >
              Close Lost
            </Button>
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary">Customer</Typography>
              <Typography variant="body1">
                <Link to={`/customers/${opp.customerId}`}>{opp.customer.companyName}</Link>
              </Typography>
            </Box>
            {opp.contact && (
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">Contact</Typography>
                <Typography variant="body1">
                  <Link to={`/contacts/${opp.contact.id}`}>{opp.contact.firstName} {opp.contact.lastName}</Link>
                </Typography>
              </Box>
            )}
            <Field label="Owner" value={`${opp.owner.firstName} ${opp.owner.lastName}`} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Expected Revenue" value={opp.expectedRevenue ? `$${parseFloat(opp.expectedRevenue).toLocaleString()}` : null} />
            <Field label="Probability" value={opp.probability !== null && opp.probability !== undefined ? `${opp.probability}%` : null} />
            <Field label="Expected Close Date" value={opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : null} />
            {opp.actualCloseDate && <Field label="Actual Close Date" value={new Date(opp.actualCloseDate).toLocaleDateString()} />}
            {opp.closeNote && <Field label="Close Note" value={opp.closeNote} />}
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">Tasks: {opp._count.tasks}</Typography>
      </Paper>
    </Box>
  );
}
