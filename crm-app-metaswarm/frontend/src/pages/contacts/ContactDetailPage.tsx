import {
  Box, Button, CircularProgress, Divider, Grid, Link as MuiLink, Paper, Typography,
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useContact, useDeleteContact } from '../../api/contacts';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box mb={1}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value ?? '—'}</Typography>
    </Box>
  );
}

export default function ContactDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
  const isManager = user?.role === 'SALES_MANAGER';
  const canDelete = isAdmin || isManager;
  const canEdit = isAdmin || isManager || user?.role === 'SALES_REPRESENTATIVE' || user?.role === 'SUPPORT_REPRESENTATIVE';

  const { data: contact, isLoading } = useContact(id);
  const deleteMutation = useDeleteContact(id);

  if (isLoading) return <CircularProgress />;
  if (!contact) return null;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Typography variant="h5" fontWeight={600}>
          {contact.firstName} {contact.lastName}
        </Typography>
        <Box display="flex" gap={1}>
          {canEdit && (
            <Button component={Link} to={`/contacts/${id}/edit`} variant="outlined">Edit</Button>
          )}
          {canDelete && (
            <Button
              variant="outlined" color="error"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary">Email</Typography>
              {contact.email
                ? <MuiLink href={`mailto:${contact.email}`}>{contact.email}</MuiLink>
                : <Typography variant="body1">—</Typography>}
            </Box>
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary">Phone</Typography>
              {contact.phone
                ? <MuiLink href={`tel:${contact.phone}`}>{contact.phone}</MuiLink>
                : <Typography variant="body1">—</Typography>}
            </Box>
            <Field label="Designation" value={contact.designation} />
            <Field label="Department" value={contact.department} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary">Company</Typography>
              <Typography variant="body1">
                <MuiLink component={Link} to={`/customers/${contact.customerId}`}>
                  {contact.customer.companyName}
                </MuiLink>
              </Typography>
            </Box>
            <Field label="Notes" value={contact.notes} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>Related Records</Typography>
        <Box display="flex" gap={3}>
          <Typography variant="body2">Activities: {contact._count.activities}</Typography>
          <Typography variant="body2">Opportunities: {contact._count.opportunities}</Typography>
        </Box>
      </Paper>
    </Box>
  );
}
