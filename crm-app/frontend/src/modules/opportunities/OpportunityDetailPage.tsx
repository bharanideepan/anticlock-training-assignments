import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, List, Paper, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useOpportunity, useCloseWon, useCloseLost } from '../../api/opportunities.api';
import { useTasks } from '../../api/tasks.api';
import { useFiles } from '../../api/files.api';
import { useAuth } from '../../shared/hooks/useAuth';
import TaskFormDialog from '../tasks/TaskFormDialog';
import TaskRow from '../../shared/components/detail/TaskRow';
import FileRow from '../../shared/components/detail/FileRow';
import EmptyTabState from '../../shared/components/detail/EmptyTabState';
import type { Opportunity, Task } from '../../shared/types/api.types';

interface OpportunityDetail extends Opportunity {
  closedAt?: string;
  _counts?: { tasks?: number; files?: number };
  customer?: { id: string; companyName: string };
  contact?: { id: string; firstName: string; lastName: string };
}

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE'].includes(user?.role?.name ?? '');

  const [tab, setTab] = useState(0);
  const [closeDialog, setCloseDialog] = useState<'won' | 'lost' | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>(undefined);

  const { data: opp, isLoading } = useOpportunity(id!);
  const closeWon = useCloseWon();
  const closeLost = useCloseLost();

  const { data: oppTasks, isLoading: tasksLoading } = useTasks(
    { opportunityId: id!, pageSize: 10 },
    tab === 0,
  );
  const { data: oppFiles, isLoading: filesLoading } = useFiles('OPPORTUNITY', id!, tab === 1);

  const handleClose = () => {
    const mutation = closeDialog === 'won' ? closeWon : closeLost;
    mutation.mutate({ id: id!, closeNote: closeNote || undefined }, {
      onSuccess: () => { setCloseDialog(null); setCloseNote(''); },
    });
  };

  if (isLoading) return <CircularProgress sx={{ m: 4 }} />;
  if (!opp) return <Typography sx={{ p: 2 }}>Opportunity not found.</Typography>;

  const oppDetail = opp as OpportunityDetail;
  const isClosed = !!oppDetail.closedAt;
  const counts = oppDetail._counts ?? {};

  const tasksData = (oppTasks as { data?: unknown[] } | undefined)?.data ?? [];
  const tasksTotal = (oppTasks as { meta?: { total?: number } } | undefined)?.meta?.total ?? tasksData.length;
  const filesData = (oppFiles as { data?: unknown[] } | undefined)?.data ?? (Array.isArray(oppFiles) ? oppFiles : []);

  return (
    <Box sx={{ maxWidth: 800, p: 3 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5">{opp.name}</Typography>
          {oppDetail.customer && (
            <Button size="small" sx={{ pl: 0 }} onClick={() => navigate(`/customers/${oppDetail.customer?.id}`)}>
              {oppDetail.customer?.companyName}
            </Button>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            label={opp.stage?.name ?? 'Unknown'}
            color={opp.stage?.terminalOutcome === 'WON' ? 'success' : opp.stage?.terminalOutcome === 'LOST' ? 'error' : 'default'}
          />
          {canEdit && !isClosed && (
            <>
              <Button variant="outlined" size="small" startIcon={<EditIcon />}
                onClick={() => navigate(`/opportunities/${id}/edit`)}>Edit</Button>
              <Button variant="outlined" size="small" color="success" startIcon={<EmojiEventsIcon />}
                onClick={() => setCloseDialog('won')}>Close Won</Button>
              <Button variant="outlined" size="small" color="error" startIcon={<ThumbDownIcon />}
                onClick={() => setCloseDialog('lost')}>Close Lost</Button>
            </>
          )}
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {opp.expectedRevenue != null && (
            <Box>
              <Typography variant="caption" color="text.secondary">Expected revenue</Typography>
              <Typography>${Number(opp.expectedRevenue).toLocaleString()}</Typography>
            </Box>
          )}
          {opp.probability != null && (
            <Box>
              <Typography variant="caption" color="text.secondary">Probability</Typography>
              <Typography>{opp.probability}%</Typography>
            </Box>
          )}
          {opp.expectedCloseDate && (
            <Box>
              <Typography variant="caption" color="text.secondary">Expected close</Typography>
              <Typography>{new Date(opp.expectedCloseDate).toLocaleDateString()}</Typography>
            </Box>
          )}
          {opp.owner && (
            <Box>
              <Typography variant="caption" color="text.secondary">Owner</Typography>
              <Typography>{opp.owner.firstName} {opp.owner.lastName}</Typography>
            </Box>
          )}
          {oppDetail.contact && (
            <Box>
              <Typography variant="caption" color="text.secondary">Contact</Typography>
              <Button size="small" sx={{ p: 0 }}
                onClick={() => navigate(`/contacts/${oppDetail.contact?.id}`)}>
                {oppDetail.contact?.firstName} {oppDetail.contact?.lastName}
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      <Paper>
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1 }}>
            <Tab label={`Tasks${counts.tasks != null ? ` (${counts.tasks})` : ''}`} />
            <Tab label={`Files${counts.files != null ? ` (${counts.files})` : ''}`} />
          </Tabs>
          {canEdit && tab === 0 && (
            <Button size="small" startIcon={<AddIcon />} sx={{ mr: 1, flexShrink: 0 }}
              onClick={() => { setEditTask(undefined); setTaskOpen(true); }}>
              Add Task
            </Button>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          {/* Tasks tab */}
          {tab === 0 && (
            <>
              {tasksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : tasksData.length === 0 ? (
                <EmptyTabState
                  icon={<CheckCircleOutlineIcon sx={{ fontSize: 48 }} />}
                  message="No tasks yet."
                  actionLabel={canEdit ? 'Add Task' : undefined}
                  onAction={() => setTaskOpen(true)}
                />
              ) : (
                <>
                  <List dense disablePadding>
                    {(tasksData as Parameters<typeof TaskRow>[0]['task'][]).map((t) => (
                      <TaskRow key={t.id} task={t} onClick={() => { setEditTask(t as unknown as Task); setTaskOpen(true); }} />
                    ))}
                  </List>
                  {tasksTotal > 10 && (
                    <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/tasks?opportunityId=${id}`)}>
                      View all →
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {/* Files tab */}
          {tab === 1 && (
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

      <TaskFormDialog
        open={taskOpen}
        onClose={() => { setTaskOpen(false); setEditTask(undefined); }}
        task={editTask}
        opportunityId={editTask ? undefined : id}
        onSuccess={() => { setTaskOpen(false); setEditTask(undefined); }}
      />

      <Dialog open={!!closeDialog} onClose={() => setCloseDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Close as {closeDialog === 'won' ? 'Won' : 'Lost'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Close note (optional)" fullWidth multiline rows={3} sx={{ mt: 1 }}
            value={closeNote} onChange={(e) => setCloseNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={closeDialog === 'won' ? 'success' : 'error'}
            onClick={handleClose}
            disabled={closeWon.isPending || closeLost.isPending}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
