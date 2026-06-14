import { useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, FormControlLabel,
  Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TablePagination, Typography, Paper,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '../../api/notifications.api';

export default function NotificationCenterPage() {
  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const { data, isLoading } = useNotifications({ page: page + 1, pageSize: 20, unreadOnly: unreadOnly || undefined });

  return (
    <Box sx={{p: 2}} >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Notifications</Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(0); }} />}
            label="Unread only"
          />
          <Button variant="outlined" startIcon={<DoneAllIcon />} onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all read
          </Button>
        </Stack>
      </Stack>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data?.map((n) => (
                <TableRow key={n.id} sx={{ bgcolor: n.isRead ? undefined : 'action.hover' }}>
                  <TableCell>
                    <Chip label={n.type.replace(/_/g, ' ')} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{fontWeight: n.isRead ? 400 : 600}} >{n.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{n.body}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(n.createdAt).toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell>
                    {!n.isRead && (
                      <Button size="small" onClick={() => markRead.mutate(n.id)}>Mark read</Button>
                    )}
                    {n.isRead && <Typography variant="caption" color="text.disabled">Read</Typography>}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{py: 4}} >No notifications.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={data?.meta?.total ?? 0}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={20}
            rowsPerPageOptions={[20]}
          />
        </Paper>
      )}
    </Box>
  );
}
