import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, CircularProgress, Divider, List, Paper, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import EventIcon from '@mui/icons-material/Event';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useContact, useDeleteContact, useContactActivities } from '../../api/contacts.api';
import { useOpportunities } from '../../api/opportunities.api';
import { useAuth } from '../../shared/hooks/useAuth';
import ActivityFormDialog from '../activities/ActivityFormDialog';
import ActivityRow from '../../shared/components/detail/ActivityRow';
import OpportunityRow from '../../shared/components/detail/OpportunityRow';
import EmptyTabState from '../../shared/components/detail/EmptyTabState';
import type { Contact } from '../../shared/types/api.types';

interface ContactWithRelations extends Contact {
  customer?: { id: string; companyName: string };
  _counts?: { activities?: number; opportunities?: number };
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SUPPORT_REPRESENTATIVE'].includes(user?.role?.name ?? '');
  const canDelete = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER'].includes(user?.role?.name ?? '');

  const [tab, setTab] = useState(0);
  const [activityOpen, setActivityOpen] = useState(false);

  const { data: contact, isLoading } = useContact(id!);
  const deleteMutation = useDeleteContact();

  const { data: activitiesPage, isLoading: activitiesLoading } = useContactActivities(id!, { pageSize: 10 }, tab === 0);
  const { data: oppsPage, isLoading: oppsLoading } = useOpportunities({ contactId: id!, pageSize: 10 }, tab === 1);

  if (isLoading) return <CircularProgress sx={{ m: 4 }} />;
  if (!contact) return <Typography sx={{ p: 2 }}>Contact not found.</Typography>;

  const contactRel = contact as ContactWithRelations;
  const counts = contactRel._counts ?? {};

  const activitiesData = (activitiesPage as { data?: unknown[] } | undefined)?.data ?? [];
  const activitiesTotal = (activitiesPage as { meta?: { total?: number } } | undefined)?.meta?.total ?? activitiesData.length;
  const oppsData = oppsPage?.data ?? [];
  const oppsTotal = oppsPage?.meta?.total ?? oppsData.length;

  const customerId = contactRel.customer?.id ?? '';

  return (
    <Box sx={{ maxWidth: 800, p: 3 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5">{contact.firstName} {contact.lastName}</Typography>
          {contact.designation && (
            <Typography variant="body2" color="text.secondary">
              {contact.designation}{contact.department ? ` · ${contact.department}` : ''}
            </Typography>
          )}
          {contactRel.customer && (
            <Button size="small" sx={{ pl: 0 }} onClick={() => navigate(`/customers/${contactRel.customer?.id}`)}>
              {contactRel.customer?.companyName}
            </Button>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          {canEdit && (
            <Button variant="outlined" size="small" startIcon={<EditIcon />}
              onClick={() => navigate(`/contacts/${id}/edit`)}>Edit</Button>
          )}
          {canDelete && (
            <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />}
              onClick={() => deleteMutation.mutate(id!, { onSuccess: () => navigate('/contacts') })}
              disabled={deleteMutation.isPending}>
              Delete
            </Button>
          )}
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={1}>
          {contact.email && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <EmailIcon fontSize="small" color="action" />
              <Typography
                variant="body2"
                component="a"
                href={`mailto:${contact.email}`}
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {contact.email}
              </Typography>
            </Stack>
          )}
          {contact.phone && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <PhoneIcon fontSize="small" color="action" />
              <Typography
                variant="body2"
                component="a"
                href={`tel:${contact.phone}`}
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {contact.phone}
              </Typography>
            </Stack>
          )}
          {contact.notes && (
            <>
              <Divider />
              <Typography variant="body2" color="text.secondary">{contact.notes}</Typography>
            </>
          )}
        </Stack>
      </Paper>

      <Paper>
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1 }}>
            <Tab label={`Activities${counts.activities != null ? ` (${counts.activities})` : ''}`} />
            <Tab label={`Opportunities${counts.opportunities != null ? ` (${counts.opportunities})` : ''}`} />
          </Tabs>
          {canEdit && tab === 0 && (
            <Button size="small" startIcon={<AddIcon />} sx={{ mr: 1, flexShrink: 0 }}
              onClick={() => setActivityOpen(true)}>
              Log Activity
            </Button>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          {/* Activities tab */}
          {tab === 0 && (
            <>
              {activitiesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : activitiesData.length === 0 ? (
                <EmptyTabState
                  icon={<EventIcon sx={{ fontSize: 48 }} />}
                  message="No activities recorded."
                  actionLabel={canEdit ? 'Log Activity' : undefined}
                  onAction={() => setActivityOpen(true)}
                />
              ) : (
                <>
                  <List dense disablePadding>
                    {(activitiesData as Parameters<typeof ActivityRow>[0]['activity'][]).map((a) => (
                      <ActivityRow key={a.id} activity={a} onClick={() => navigate(`/activities/${a.id}`)} />
                    ))}
                  </List>
                  {activitiesTotal > 10 && (
                    <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/activities?contactId=${id}`)}>
                      View all →
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {/* Opportunities tab */}
          {tab === 1 && (
            <>
              {oppsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : oppsData.length === 0 ? (
                <EmptyTabState
                  icon={<TrendingUpIcon sx={{ fontSize: 48 }} />}
                  message="No opportunities linked to this contact."
                />
              ) : (
                <>
                  <List dense disablePadding>
                    {(oppsData as Parameters<typeof OpportunityRow>[0]['opportunity'][]).map((o) => (
                      <OpportunityRow key={o.id} opportunity={o} onClick={() => navigate(`/opportunities/${o.id}`)} />
                    ))}
                  </List>
                  {oppsTotal > 10 && (
                    <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/opportunities?contactId=${id}`)}>
                      View all →
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </Box>
      </Paper>

      <ActivityFormDialog
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        customerId={customerId}
        contactId={id}
        onCreated={() => setActivityOpen(false)}
      />
    </Box>
  );
}
