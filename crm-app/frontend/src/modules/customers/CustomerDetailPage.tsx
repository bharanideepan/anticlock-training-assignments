import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, List, Paper,
  Stack, Tab, Tabs, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import {
  useCustomer, useArchiveCustomer,
  useCustomerContacts, useCustomerActivities,
  useCustomerOpportunities, useCustomerTasks, useCustomerFiles,
} from '../../api/customers.api';
import { useAuth } from '../../shared/hooks/useAuth';
import ActivityFormDialog from '../activities/ActivityFormDialog';
import TaskFormDialog from '../tasks/TaskFormDialog';
import ContactRow from '../../shared/components/detail/ContactRow';
import ActivityRow from '../../shared/components/detail/ActivityRow';
import OpportunityRow from '../../shared/components/detail/OpportunityRow';
import TaskRow from '../../shared/components/detail/TaskRow';
import FileRow from '../../shared/components/detail/FileRow';
import EmptyTabState from '../../shared/components/detail/EmptyTabState';
import type { Customer, CustomerStatus, Task } from '../../shared/types/api.types';

interface CustomerWithCounts extends Customer {
  _counts?: { contacts?: number; activities?: number; openOpportunities?: number; openTasks?: number; files?: number };
}

const STATUS_COLORS: Record<CustomerStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PROSPECT: 'info',
  ACTIVE: 'success',
  INACTIVE: 'warning',
  ARCHIVED: 'default',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE'].includes(user?.role?.name ?? '');
  const canArchive = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER'].includes(user?.role?.name ?? '');

  const [tab, setTab] = useState(0);
  const [activityOpen, setActivityOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>(undefined);

  const { data: customer, isLoading } = useCustomer(id!);
  const archive = useArchiveCustomer();

  const { data: contacts, isLoading: contactsLoading } = useCustomerContacts(id!, { pageSize: 10 }, tab === 0);
  const { data: activities, isLoading: activitiesLoading } = useCustomerActivities(id!, { pageSize: 10 }, tab === 1);
  const { data: opportunities, isLoading: oppsLoading } = useCustomerOpportunities(id!, { pageSize: 10 }, tab === 2);
  const { data: tasks, isLoading: tasksLoading } = useCustomerTasks(id!, { pageSize: 10 }, tab === 3);
  const { data: files, isLoading: filesLoading } = useCustomerFiles(id!, tab === 4);

  if (isLoading) return <CircularProgress sx={{ m: 4 }} />;
  if (!customer) return <Typography sx={{ p: 2 }}>Customer not found.</Typography>;

  const counts = (customer as CustomerWithCounts)._counts ?? {};

  const contactsData = (contacts as { data?: unknown[] } | undefined)?.data ?? [];
  const activitiesData = (activities as { data?: unknown[] } | undefined)?.data ?? [];
  const oppsData = (opportunities as { data?: unknown[] } | undefined)?.data ?? [];
  const tasksData = (tasks as { data?: unknown[] } | undefined)?.data ?? [];
  const filesData = (files as { data?: unknown[] } | undefined)?.data ?? (Array.isArray(files) ? files : []);

  const contactsTotal = (contacts as { meta?: { total?: number } } | undefined)?.meta?.total ?? contactsData.length;
  const activitiesTotal = (activities as { meta?: { total?: number } } | undefined)?.meta?.total ?? activitiesData.length;
  const oppsTotal = (opportunities as { meta?: { total?: number } } | undefined)?.meta?.total ?? oppsData.length;
  const tasksTotal = (tasks as { meta?: { total?: number } } | undefined)?.meta?.total ?? tasksData.length;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5">{customer.companyName}</Typography>
          {customer.website && (
            <Typography variant="body2" color="text.secondary" component="a" href={customer.website} target="_blank">
              {customer.website}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label={customer.status} color={STATUS_COLORS[customer.status]} />
          {canEdit && (
            <Button variant="outlined" size="small" startIcon={<EditIcon />}
              onClick={() => navigate(`/customers/${id}/edit`)}>
              Edit
            </Button>
          )}
          {canArchive && customer.status !== 'ARCHIVED' && (
            <Button variant="outlined" size="small" color="warning" startIcon={<ArchiveIcon />}
              onClick={() => archive.mutate(id!, { onSuccess: () => {} })}
              disabled={archive.isPending}>
              Archive
            </Button>
          )}
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {customer.industry && (
            <Box>
              <Typography variant="caption" color="text.secondary">Industry</Typography>
              <Typography>{customer.industry}</Typography>
            </Box>
          )}
          {customer.revenueRange && (
            <Box>
              <Typography variant="caption" color="text.secondary">Revenue</Typography>
              <Typography>{customer.revenueRange.replace(/_/g, ' ')}</Typography>
            </Box>
          )}
          {customer.city && (
            <Box>
              <Typography variant="caption" color="text.secondary">Location</Typography>
              <Typography>{[customer.city, customer.country].filter(Boolean).join(', ')}</Typography>
            </Box>
          )}
          {customer.owner && (
            <Box>
              <Typography variant="caption" color="text.secondary">Owner</Typography>
              <Typography>{customer.owner.firstName} {customer.owner.lastName}</Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      <Paper>
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1 }}>
            <Tab label={`Contacts${counts.contacts != null ? ` (${counts.contacts})` : ''}`} />
            <Tab label={`Activities${counts.activities != null ? ` (${counts.activities})` : ''}`} />
            <Tab label={`Opportunities${counts.openOpportunities != null ? ` (${counts.openOpportunities})` : ''}`} />
            <Tab label={`Tasks${counts.openTasks != null ? ` (${counts.openTasks})` : ''}`} />
            <Tab label={`Files${counts.files != null ? ` (${counts.files})` : ''}`} />
          </Tabs>
          {canEdit && tab === 0 && (
            <Button size="small" startIcon={<AddIcon />} sx={{ mr: 1, flexShrink: 0 }}
              onClick={() => navigate('/contacts/new', { state: { customerId: id } })}>
              Add Contact
            </Button>
          )}
          {canEdit && tab === 1 && (
            <Button size="small" startIcon={<AddIcon />} sx={{ mr: 1, flexShrink: 0 }}
              onClick={() => setActivityOpen(true)}>
              Log Activity
            </Button>
          )}
          {canEdit && tab === 2 && (
            <Button size="small" startIcon={<AddIcon />} sx={{ mr: 1, flexShrink: 0 }}
              onClick={() => navigate('/opportunities/new', { state: { customerId: id } })}>
              Add Opportunity
            </Button>
          )}
          {canEdit && tab === 3 && (
            <Button size="small" startIcon={<AddIcon />} sx={{ mr: 1, flexShrink: 0 }}
              onClick={() => { setEditTask(undefined); setTaskOpen(true); }}>
              Add Task
            </Button>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          {/* Contacts tab */}
          {tab === 0 && (
            <>
              {contactsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : contactsData.length === 0 ? (
                <EmptyTabState
                  icon={<PeopleIcon sx={{ fontSize: 48 }} />}
                  message="No contacts yet."
                  actionLabel={canEdit ? 'Add Contact' : undefined}
                  onAction={() => navigate('/contacts/new', { state: { customerId: id } })}
                />
              ) : (
                <>
                  <List dense disablePadding>
                    {(contactsData as Parameters<typeof ContactRow>[0]['contact'][]).map((c) => (
                      <ContactRow key={c.id} contact={c} onClick={() => navigate(`/contacts/${c.id}`)} />
                    ))}
                  </List>
                  {contactsTotal > 10 && (
                    <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/contacts?customerId=${id}`)}>
                      View all →
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {/* Activities tab */}
          {tab === 1 && (
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
                    <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/activities?customerId=${id}`)}>
                      View all →
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {/* Opportunities tab */}
          {tab === 2 && (
            <>
              {oppsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : oppsData.length === 0 ? (
                <EmptyTabState
                  icon={<TrendingUpIcon sx={{ fontSize: 48 }} />}
                  message="No opportunities yet."
                  actionLabel={canEdit ? 'Add Opportunity' : undefined}
                  onAction={() => navigate('/opportunities/new', { state: { customerId: id } })}
                />
              ) : (
                <>
                  <List dense disablePadding>
                    {(oppsData as Parameters<typeof OpportunityRow>[0]['opportunity'][]).map((o) => (
                      <OpportunityRow key={o.id} opportunity={o} onClick={() => navigate(`/opportunities/${o.id}`)} />
                    ))}
                  </List>
                  {oppsTotal > 10 && (
                    <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/opportunities?customerId=${id}`)}>
                      View all →
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {/* Tasks tab */}
          {tab === 3 && (
            <>
              {tasksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : tasksData.length === 0 ? (
                <EmptyTabState
                  icon={<CheckCircleOutlineIcon sx={{ fontSize: 48 }} />}
                  message="No tasks yet."
                  actionLabel={canEdit ? 'Add Task' : undefined}
                  onAction={() => { setEditTask(undefined); setTaskOpen(true); }}
                />
              ) : (
                <>
                  <List dense disablePadding>
                    {(tasksData as Parameters<typeof TaskRow>[0]['task'][]).map((t) => (
                      <TaskRow key={t.id} task={t} onClick={() => { setEditTask(t as unknown as Task); setTaskOpen(true); }} />
                    ))}
                  </List>
                  {tasksTotal > 10 && (
                    <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/tasks?customerId=${id}`)}>
                      View all →
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {/* Files tab */}
          {tab === 4 && (
            <>
              {filesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : filesData.length === 0 ? (
                <EmptyTabState
                  icon={<InsertDriveFileIcon sx={{ fontSize: 48 }} />}
                  message="No files attached."
                />
              ) : (
                <List dense disablePadding>
                  {(filesData as Parameters<typeof FileRow>[0]['file'][]).map((f) => (
                    <FileRow key={f.id} file={f} />
                  ))}
                </List>
              )}
            </>
          )}
        </Box>
      </Paper>

      <ActivityFormDialog
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        customerId={id!}
        onCreated={() => setActivityOpen(false)}
      />
      <TaskFormDialog
        open={taskOpen}
        onClose={() => { setTaskOpen(false); setEditTask(undefined); }}
        task={editTask}
        customerId={editTask ? undefined : id}
        onSuccess={() => { setTaskOpen(false); setEditTask(undefined); }}
      />
    </Box>
  );
}
