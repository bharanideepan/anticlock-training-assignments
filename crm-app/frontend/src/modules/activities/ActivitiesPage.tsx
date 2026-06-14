import { useState } from 'react';
import {
  Box, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Paper,
  Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { useActivities } from '../../api/activities.api';
import EmptyState from '../../shared/components/EmptyState';
import type { ActivityType } from '../../shared/types/api.types';

const TYPE_LABELS: Record<ActivityType, string> = {
  PHONE_CALL: 'Phone Call',
  MEETING: 'Meeting',
  EMAIL: 'Email',
  NOTE: 'Note',
  FOLLOW_UP: 'Follow-up',
};

const TYPE_COLORS: Record<ActivityType, 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning'> = {
  PHONE_CALL: 'primary',
  MEETING: 'secondary',
  EMAIL: 'info',
  NOTE: 'default',
  FOLLOW_UP: 'warning',
};

export default function ActivitiesPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<ActivityType | ''>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useActivities({
    page: page + 1,
    pageSize,
    type: typeFilter || undefined,
  });

  const activities = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const filtered = search.trim()
    ? activities.filter((a) =>
        a.subject.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase())
      )
    : activities;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Activities</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>All CRM activity logs across customers and contacts</Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as ActivityType | ''); setPage(0); }}
          >
            <MenuItem value="">All types</MenuItem>
            {(Object.keys(TYPE_LABELS) as ActivityType[]).map((t) => (
              <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Scheduled</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ border: 0 }}>
                  <EmptyState
                    title="No activities found"
                    description={typeFilter || search ? 'Try clearing filters to see more results.' : 'Activities will appear here once they are logged.'}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((activity) => (
                <TableRow key={activity.id} hover>
                  <TableCell>
                    <Chip
                      label={TYPE_LABELS[activity.type]}
                      size="small"
                      color={TYPE_COLORS[activity.type]}
                      variant="outlined"
                      sx={{ fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Tooltip title={activity.subject}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {activity.subject}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Tooltip title={activity.description ?? ''} disableHoverListener={!activity.description}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {activity.description ?? '—'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {activity.scheduledAt
                      ? new Date(activity.scheduledAt).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {activity.durationMinutes ? `${activity.durationMinutes} min` : '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && filtered.length > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={pageSize}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        )}
      </TableContainer>
    </Box>
  );
}
