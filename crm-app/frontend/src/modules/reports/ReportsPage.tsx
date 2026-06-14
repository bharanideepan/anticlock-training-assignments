import { useState } from 'react';
import {
  Box, Button, CircularProgress, Divider, FormControl,
  InputLabel, MenuItem, Paper, Select, Stack, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useReportData, useReportExport, type ReportFilter } from '../../api/reports.api';
import ReportFilters from './ReportFilters';

const REPORT_TYPES = [
  { value: 'sales-revenue', label: 'Revenue Performance', group: 'Sales' },
  { value: 'sales-win-rate', label: 'Win Rate', group: 'Sales' },
  { value: 'sales-conversion', label: 'Conversion Rate', group: 'Sales' },
  { value: 'sales-opportunity-trends', label: 'Opportunity Trends', group: 'Sales' },
  { value: 'customers-growth', label: 'Customer Growth', group: 'Customer' },
  { value: 'customers-distribution', label: 'Customer Distribution', group: 'Customer' },
  { value: 'customers-industry', label: 'Industry Analysis', group: 'Customer' },
  { value: 'productivity-activity', label: 'Activity Completion', group: 'Productivity' },
  { value: 'productivity-task', label: 'Task Completion', group: 'Productivity' },
  { value: 'productivity-opportunity', label: 'Opportunity Ownership', group: 'Productivity' },
];

export default function ReportsPage() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [reportType, setReportType] = useState('sales-revenue');
  const [filter, setFilter] = useState<ReportFilter>({ fromDate: firstOfMonth, toDate: endOfMonth });
  const [appliedFilter, setAppliedFilter] = useState<ReportFilter | null>(null);

  const exportReport = useReportExport();
  const { data, isLoading } = useReportData(reportType, appliedFilter ?? filter, !!appliedFilter);

  const handleApply = (f: ReportFilter) => {
    setFilter(f);
    setAppliedFilter(f);
  };

  const handleExport = () => {
    exportReport.mutate({ reportType, filter: appliedFilter ?? filter });
  };

  return (
    <Box sx={{p: 2}} >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Reports</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={exportReport.isPending || !appliedFilter}
        >
          Export CSV
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={3}>
          <FormControl size="small" sx={{ maxWidth: 320 }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              label="Report Type"
              value={reportType}
              onChange={(e) => { setReportType(e.target.value); setAppliedFilter(null); }}
            >
              {REPORT_TYPES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  <Typography variant="body2">
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      [{r.group}]
                    </Typography>
                    {r.label}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <ReportFilters onApply={handleApply} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, minHeight: 200 }}>
        {!appliedFilter && (
          <Typography color="text.secondary">Select a report type and apply filters to view results.</Typography>
        )}
        {appliedFilter && isLoading && <CircularProgress />}
        {appliedFilter && !isLoading && data && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{mb: 2}}>
              {REPORT_TYPES.find((r) => r.value === reportType)?.label} — {new Date(appliedFilter.fromDate).toLocaleDateString()} to {new Date(appliedFilter.toDate).toLocaleDateString()}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: 500 }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
