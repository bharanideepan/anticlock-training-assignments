import { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAuditLogs } from '../../api/audit.api';
import type { AuditAction } from '../../shared/types/api.types';

const AUDIT_ACTIONS: AuditAction[] = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET',
  'RECORD_CREATED', 'RECORD_UPDATED', 'RECORD_DELETED',
  'STATUS_CHANGED', 'OWNERSHIP_CHANGED', 'ROLE_CHANGED', 'IMPORT_COMPLETED',
];

const ACTION_COLOR: Record<AuditAction, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  LOGIN: 'success',
  LOGOUT: 'default',
  LOGIN_FAILED: 'error',
  PASSWORD_RESET: 'warning',
  RECORD_CREATED: 'success',
  RECORD_UPDATED: 'info',
  RECORD_DELETED: 'error',
  STATUS_CHANGED: 'warning',
  OWNERSHIP_CHANGED: 'warning',
  ROLE_CHANGED: 'warning',
  IMPORT_COMPLETED: 'info',
};

function DiffRow({ label, prev, next }: { label: string; prev?: unknown; next?: unknown }) {
  return (
    <Box sx={{display: "flex", gap: 1, mb: 0.5}} >
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>{label}</Typography>
      {prev !== undefined && (
        <Typography variant="caption" sx={{ bgcolor: 'error.50', px: 0.5, borderRadius: 0.5 }}>
          - {JSON.stringify(prev)}
        </Typography>
      )}
      {next !== undefined && (
        <Typography variant="caption" sx={{ bgcolor: 'success.50', px: 0.5, borderRadius: 0.5 }}>
          + {JSON.stringify(next)}
        </Typography>
      )}
    </Box>
  );
}

function ExpandableRow({ log }: { log: NonNullable<ReturnType<typeof useAuditLogs>['data']>['data'][number] }) {
  const [open, setOpen] = useState(false);
  const hasDiff = log.previousValue || log.newValue;

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 170 }}>
          <Typography variant="caption">{new Date(log.createdAt).toLocaleString()}</Typography>
        </TableCell>
        <TableCell sx={{ maxWidth: 160 }}>
          <Tooltip title={log.actor ? `${log.actor.firstName} ${log.actor.lastName} — ${log.actor.email}` : ''} disableHoverListener={!log.actor}>
            <Box>
              <Typography variant="body2" noWrap>
                {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : '—'}
              </Typography>
              {log.actor && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {log.actor.email}
                </Typography>
              )}
            </Box>
          </Tooltip>
        </TableCell>
        <TableCell>
          <Chip
            label={log.action}
            size="small"
            color={ACTION_COLOR[log.action as AuditAction] ?? 'default'}
          />
        </TableCell>
        <TableCell>{log.resourceType || '—'}</TableCell>
        <TableCell>
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            {log.resourceId ? log.resourceId.slice(0, 8) + '…' : '—'}
          </Typography>
        </TableCell>
        <TableCell>{log.ipAddress || '—'}</TableCell>
        <TableCell padding="checkbox">
          {hasDiff && (
            <IconButton size="small" onClick={() => setOpen((o) => !o)}>
              {open ? <ExpandLessIcon sx={{fontSize: "small"}} /> : <ExpandMoreIcon sx={{fontSize: "small"}} />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      {hasDiff && (
        <TableRow>
          <TableCell colSpan={7} sx={{ py: 0, borderBottom: 0 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{bgcolor: "grey.50", p: 1}} >
                {log.previousValue &&
                  Object.keys(log.previousValue).map((k) => (
                    <DiffRow
                      key={k}
                      label={k}
                      prev={(log.previousValue as Record<string, unknown>)[k]}
                      next={log.newValue ? (log.newValue as Record<string, unknown>)[k] : undefined}
                    />
                  ))}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, isLoading } = useAuditLogs({
    page: page + 1,
    pageSize,
    action: action || undefined,
    resourceType: resourceType || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const logs = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  return (
    <Box sx={{p: 2}} >
      <Typography variant="h5" sx={{mb: 2}} >Audit Log</Typography>

      <Box sx={{display: "flex", flexWrap: "wrap", gap: 2, mb: 2}} >
        <TextField
          select
          label="Action"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(0); }}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All actions</MenuItem>
          {AUDIT_ACTIONS.map((a) => (
            <MenuItem key={a} value={a}>{a}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Resource type"
          value={resourceType}
          onChange={(e) => { setResourceType(e.target.value); setPage(0); }}
          size="small"
          placeholder="e.g. Customer"
          sx={{ width: 160 }}
        />
        <TextField
          label="From"
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To"
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(0); }}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      <Paper variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource type</TableCell>
              <TableCell>Resource ID</TableCell>
              <TableCell>IP</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} align="center">Loading…</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No audit records found.</TableCell></TableRow>
            ) : (
              logs.map((log) => <ExpandableRow key={log.id} log={log} />)
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
