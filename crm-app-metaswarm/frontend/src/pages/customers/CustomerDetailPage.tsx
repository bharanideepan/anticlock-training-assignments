import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCustomer, useArchiveCustomer, useUnarchiveCustomer } from '../../api/customers';

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  PROSPECT: 'default',
  ACTIVE: 'success',
  INACTIVE: 'warning',
  ARCHIVED: 'error',
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box mb={1}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value ?? '—'}</Typography>
    </Box>
  );
}

export default function CustomerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
  const isManager = user?.role === 'SALES_MANAGER';
  const canArchive = isAdmin || isManager;
  const canEdit = isAdmin || isManager || user?.role === 'SALES_REPRESENTATIVE';

  const { data: customer, isLoading } = useCustomer(id);
  const archiveMutation = useArchiveCustomer(id);
  const unarchiveMutation = useUnarchiveCustomer(id);

  if (isLoading) return <CircularProgress />;
  if (!customer) return null;

  const isArchived = customer.status === 'ARCHIVED';

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {customer.companyName}
          </Typography>
          <Chip
            label={customer.status}
            color={STATUS_COLOR[customer.status] ?? 'default'}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Box>

        <Box display="flex" gap={1}>
          {canEdit && !isArchived && (
            <Button component={Link} to={`/customers/${id}/edit`} variant="outlined">
              Edit
            </Button>
          )}
          {canArchive && !isArchived && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              Archive
            </Button>
          )}
          {canArchive && isArchived && (
            <Button
              variant="outlined"
              onClick={() => unarchiveMutation.mutate()}
              disabled={unarchiveMutation.isPending}
            >
              Unarchive
            </Button>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Field label="Industry" value={customer.industry} />
            <Field label="Website" value={customer.website} />
            <Field label="Revenue Range" value={customer.revenueRange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Address" value={customer.addressLine1} />
            <Field label="City / State" value={[customer.city, customer.state].filter(Boolean).join(', ')} />
            <Field label="Country" value={customer.country} />
            <Field label="Postal Code" value={customer.postalCode} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Owner
        </Typography>
        <Typography>
          {customer.owner.firstName} {customer.owner.lastName}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Related Records
        </Typography>
        <Box display="flex" gap={3}>
          <Typography variant="body2">Contacts: {customer._count.contacts}</Typography>
          <Typography variant="body2">Activities: {customer._count.activities}</Typography>
          <Typography variant="body2">Opportunities: {customer._count.opportunities}</Typography>
          <Typography variant="body2">Tasks: {customer._count.tasks}</Typography>
        </Box>
      </Paper>
    </Box>
  );
}
