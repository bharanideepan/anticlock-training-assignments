import { useState } from 'react';
import {
  Box, Button, CircularProgress, Divider, Grid, List, ListItemButton,
  ListItemText, Paper, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import {
  useSalesRevenue, useSalesWinRate, useSalesConversionRate,
  useCustomersGrowth, useCustomersDistribution, useProductivityTaskCompletion,
  downloadReport, type ReportParams,
} from '../../api/reports';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  {
    label: 'Sales',
    reports: [
      { key: 'sales-revenue', label: 'Revenue Performance' },
      { key: 'sales-win-rate', label: 'Win Rate Analysis' },
      { key: 'sales-conversion', label: 'Conversion Rate' },
      { key: 'sales-opportunity-trends', label: 'Opportunity Trends' },
    ],
  },
  {
    label: 'Customer',
    reports: [
      { key: 'customers-growth', label: 'Customer Growth' },
      { key: 'customers-distribution', label: 'Customer Distribution' },
      { key: 'customers-industry', label: 'Industry Analysis' },
    ],
  },
  {
    label: 'User Productivity',
    reports: [
      { key: 'productivity-activity', label: 'Activity Completion' },
      { key: 'productivity-task', label: 'Task Completion' },
      { key: 'productivity-opportunity', label: 'Opportunity Ownership' },
    ],
  },
] as const;

type ReportKey = 'sales-revenue' | 'sales-win-rate' | 'sales-conversion' | 'sales-opportunity-trends'
  | 'customers-growth' | 'customers-distribution' | 'customers-industry'
  | 'productivity-activity' | 'productivity-task' | 'productivity-opportunity';

function getDefaultDates() {
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);
  return { fromDate: from.toISOString().split('T')[0], toDate: to.toISOString().split('T')[0] };
}

function ReportContent({ reportKey, params }: { reportKey: ReportKey; params: ReportParams }) {
  const salesRevenue = useSalesRevenue(params);
  const salesWinRate = useSalesWinRate(params);
  const salesConversion = useSalesConversionRate(params);
  const customersGrowth = useCustomersGrowth(params);
  const customersDist = useCustomersDistribution(params);
  const taskCompletion = useProductivityTaskCompletion(params);

  const queryMap: Record<ReportKey, ReturnType<typeof useSalesRevenue>> = {
    'sales-revenue': salesRevenue,
    'sales-win-rate': salesWinRate as never,
    'sales-conversion': salesConversion as never,
    'sales-opportunity-trends': salesRevenue, // placeholder
    'customers-growth': customersGrowth as never,
    'customers-distribution': customersDist as never,
    'customers-industry': customersDist as never, // placeholder
    'productivity-activity': taskCompletion as never, // placeholder
    'productivity-task': taskCompletion as never,
    'productivity-opportunity': taskCompletion as never, // placeholder
  };

  const { data, isLoading } = queryMap[reportKey] ?? {};

  if (isLoading) return <CircularProgress />;
  if (!data) return <Typography color="text.secondary">No data</Typography>;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary" mb={1}>Report data</Typography>
      <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 400 }}>
        {JSON.stringify(data, null, 2)}
      </Box>
    </Paper>
  );
}

export default function ReportPage() {
  const { accessToken } = useAuth();
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeReport, setActiveReport] = useState<ReportKey>('sales-revenue');
  const defaults = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaults.fromDate);
  const [toDate, setToDate] = useState(defaults.toDate);
  const [isExporting, setIsExporting] = useState(false);

  const params: ReportParams = { fromDate, toDate };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadReport(accessToken!, activeReport, params);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>Reports & Analytics</Typography>

      <Grid container spacing={3}>
        {/* Left sidebar */}
        <Grid item xs={12} md={3}>
          <Paper variant="outlined">
            <Tabs
              orientation="vertical"
              value={activeCategory}
              onChange={(_, v: number) => setActiveCategory(v)}
              sx={{ borderRight: 1, borderColor: 'divider' }}
            >
              {CATEGORIES.map((cat, idx) => (
                <Tab key={cat.label} label={cat.label} value={idx} sx={{ alignItems: 'flex-start' }} />
              ))}
            </Tabs>
          </Paper>

          <Paper variant="outlined" sx={{ mt: 2 }}>
            <List dense disablePadding>
              {CATEGORIES[activeCategory].reports.map((r) => (
                <ListItemButton
                  key={r.key}
                  selected={activeReport === r.key}
                  onClick={() => setActiveReport(r.key as ReportKey)}
                >
                  <ListItemText primary={r.label} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Main report area */}
        <Grid item xs={12} md={9}>
          {/* Filter panel */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <TextField
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <Box flex={1} />
              <Button
                variant="outlined"
                startIcon={isExporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={() => void handleExport()}
                disabled={isExporting}
              >
                Export CSV
              </Button>
            </Stack>
          </Paper>

          <Divider sx={{ mb: 3 }} />

          <ReportContent reportKey={activeReport} params={params} />
        </Grid>
      </Grid>
    </Box>
  );
}
