import { Grid, Box, Typography, Paper, Divider } from '@mui/material';
import { useDashboardMetrics } from '../../api/dashboard.api';
import { useAuth } from '../../shared/hooks/useAuth';
import MetricCard from './MetricCard';
import RevenueTrendChart from './charts/RevenueTrendChart';
import PipelineFunnelChart from './charts/PipelineFunnelChart';
import ActivityTrendChart from './charts/ActivityTrendChart';
import TeamPerformanceTable from './charts/TeamPerformanceTable';

export default function DashboardPage() {
  const { data: metrics, isLoading } = useDashboardMetrics();
  const user = useAuth((s) => s.user);
  const isManager = user?.role?.name === 'SYSTEM_ADMINISTRATOR' || user?.role?.name === 'SALES_MANAGER';

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Overview of your CRM performance</Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <MetricCard title="Total Customers" value={metrics?.totalCustomers ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <MetricCard title="New This Month" value={metrics?.newCustomersThisPeriod ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <MetricCard title="Active Opps" value={metrics?.activeOpportunities ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <MetricCard title="Won This Month" value={metrics?.wonOpportunitiesThisPeriod ?? 0} loading={isLoading} valueColor="success.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <MetricCard
            title="Pipeline Value"
            value={metrics ? `$${Number(metrics.pipelineValue).toLocaleString()}` : '—'}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <MetricCard
            title="Revenue Forecast"
            value={metrics ? `$${Number(metrics.revenueForcast).toLocaleString()}` : '—'}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <MetricCard title="Open Tasks" value={metrics?.openTasks ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <MetricCard
            title="Overdue Tasks"
            value={metrics?.overdueTasks ?? 0}
            loading={isLoading}
            valueColor={metrics?.overdueTasks ? 'error.main' : undefined}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: '12px 16px' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Revenue Trend — 6 Months</Typography>
            <RevenueTrendChart />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: '12px 16px' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Pipeline by Stage</Typography>
            <PipelineFunnelChart />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: isManager ? 6 : 12 }}>
          <Paper variant="outlined" sx={{ p: '12px 16px' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Activity Trend — 14 Days</Typography>
            <ActivityTrendChart />
          </Paper>
        </Grid>

        {isManager && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: '12px 16px' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Team Performance — This Month</Typography>
              <TeamPerformanceTable />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
