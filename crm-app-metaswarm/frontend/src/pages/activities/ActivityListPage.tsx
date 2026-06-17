import { useState, useCallback } from 'react';
import {
  Box, Button, Chip, CircularProgress, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useActivities } from '../../api/activities';
import type { ActivityQueryParams, ActivityType } from '../../api/activities';

const TYPE_COLOR: Record<ActivityType, 'default' | 'primary' | 'success' | 'info' | 'warning'> = {
  PHONE_CALL: 'primary',
  MEETING: 'success',
  EMAIL: 'info',
  NOTE: 'default',
  FOLLOW_UP: 'warning',
};

const WRITE_ROLES = [
  'SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SUPPORT_REPRESENTATIVE',
];

export default function ActivityListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = WRITE_ROLES.includes(user?.role ?? '');

  const [params, setParams] = useState<ActivityQueryParams>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useActivities(params);

  const handleTypeChange = useCallback((e: { target: { value: string } }) => {
    const val = e.target.value as ActivityType | '';
    setParams((prev) => ({ ...prev, type: val || undefined, page: 1 }));
  }, []);

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>Activities</Typography>
        {canCreate && (
          <Button variant="contained" onClick={() => navigate('/activities/new')}>
            New Activity
          </Button>
        )}
      </Box>

      <Box mb={2}>
        <Select
          size="small"
          displayEmpty
          value={params.type ?? ''}
          onChange={handleTypeChange}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          <MenuItem value="PHONE_CALL">Phone Call</MenuItem>
          <MenuItem value="MEETING">Meeting</MenuItem>
          <MenuItem value="EMAIL">Email</MenuItem>
          <MenuItem value="NOTE">Note</MenuItem>
          <MenuItem value="FOLLOW_UP">Follow Up</MenuItem>
        </Select>
      </Box>

      {isLoading && <CircularProgress />}

      {!isLoading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Scheduled</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.data ?? []).map((a) => (
                <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/activities/${a.id}`)}>
                  <TableCell>
                    <Chip label={a.type.replace('_', ' ')} color={TYPE_COLOR[a.type]} size="small" />
                  </TableCell>
                  <TableCell>{a.subject}</TableCell>
                  <TableCell>{a.customer.companyName}</TableCell>
                  <TableCell>{a.createdBy.firstName} {a.createdBy.lastName}</TableCell>
                  <TableCell>{a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
              {(data?.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No activities found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data && (
        <Typography variant="body2" color="text.secondary" mt={1}>
          {data.meta.total} total activit{data.meta.total !== 1 ? 'ies' : 'y'}
        </Typography>
      )}
    </Box>
  );
}
