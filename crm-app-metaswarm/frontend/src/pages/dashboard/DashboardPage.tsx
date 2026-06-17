import {
  Box, Card, CardContent, CircularProgress, Grid, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import {
  useDashboardMetrics,
  useRevenueTrend,
  usePipelineFunnel,
  useActivityTrend,
  useTeamPerformance,
  useOpportunityDistribution,
} from '../../api/dashboard';

const PIE_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7'];

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} mt={0.5}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

function formatCurrency(val: string): string {
  const n = Number(val);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isManagerUp = user?.role === 'SYSTEM_ADMINISTRATOR' || user?.role === 'SALES_MANAGER';

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: revenueTrend, isLoading: trendLoading } = useRevenueTrend();
  const { data: pipelineFunnel, isLoading: funnelLoading } = usePipelineFunnel();
  const { data: activityTrend, isLoading: activityLoading } = useActivityTrend();
  const { data: teamPerf } = useTeamPerformance();
  const { data: oppDist, isLoading: distLoading } = useOpportunityDistribution();

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>Dashboard</Typography>

      {/* KPI Cards */}
      {metricsLoading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}><KpiCard label="Total Customers" value={metrics?.totalCustomers ?? 0} /></Grid>
          <Grid item xs={6} sm={3}><KpiCard label="Active Opportunities" value={metrics?.activeOpportunities ?? 0} /></Grid>
          <Grid item xs={6} sm={3}><KpiCard label="Pipeline Value" value={formatCurrency(metrics?.pipelineValue ?? '0')} /></Grid>
          <Grid item xs={6} sm={3}><KpiCard label="Revenue Forecast" value={formatCurrency(metrics?.revenueForecast ?? '0')} /></Grid>
          <Grid item xs={6} sm={3}><KpiCard label="New Customers (Period)" value={metrics?.newCustomersThisPeriod ?? 0} /></Grid>
          <Grid item xs={6} sm={3}><KpiCard label="Won (Period)" value={metrics?.wonOpportunitiesThisPeriod ?? 0} /></Grid>
          <Grid item xs={6} sm={3}><KpiCard label="Open Tasks" value={metrics?.openTasks ?? 0} /></Grid>
          <Grid item xs={6} sm={3}><KpiCard label="Overdue Tasks" value={metrics?.overdueTasks ?? 0} /></Grid>
        </Grid>
      )}

      {/* Revenue Trend */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>Revenue Trend (6 months)</Typography>
        {trendLoading ? (
          <CircularProgress />
        ) : !revenueTrend?.labels?.length ? (
          <Typography color="text.secondary">No revenue data for this period.</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueTrend.labels.map((l, i) => ({
              label: l, won: revenueTrend.wonRevenue[i], forecast: revenueTrend.forecastRevenue[i],
            }))}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="won" name="Won Revenue" stroke="#1976d2" />
              <Line type="monotone" dataKey="forecast" name="Forecast Revenue" stroke="#388e3c" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* Pipeline Funnel */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>Pipeline Funnel</Typography>
        {funnelLoading ? (
          <CircularProgress />
        ) : !pipelineFunnel?.length ? (
          <Typography color="text.secondary">No active opportunities in the pipeline.</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={pipelineFunnel}>
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="Opportunities" fill="#1976d2" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Grid container spacing={2} mb={3}>
        {/* Activity Trend */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Activity Trend (30 days)</Typography>
            {activityLoading ? (
              <CircularProgress />
            ) : !activityTrend?.labels?.length ? (
              <Typography color="text.secondary">No activities logged in this period.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activityTrend.labels.map((l, i) => ({
                  label: l,
                  call: activityTrend.phoneCall[i],
                  meeting: activityTrend.meeting[i],
                  email: activityTrend.email[i],
                }))}>
                  <XAxis dataKey="label" tick={false} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="call" name="Phone Call" fill="#1976d2" stackId="a" />
                  <Bar dataKey="meeting" name="Meeting" fill="#388e3c" stackId="a" />
                  <Bar dataKey="email" name="Email" fill="#f57c00" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Opportunity Distribution */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Opportunity Distribution</Typography>
            {distLoading ? (
              <CircularProgress />
            ) : !oppDist?.length ? (
              <Typography color="text.secondary">No opportunity data available.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={oppDist} dataKey="count" nameKey="industry" cx="50%" cy="50%" outerRadius={80} label>
                    {oppDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Team Performance — manager/admin only */}
      {isManagerUp && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Team Performance</Typography>
          {!teamPerf?.length ? (
            <Typography color="text.secondary">No team data available.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Won Opps</TableCell>
                    <TableCell align="right">Won Revenue</TableCell>
                    <TableCell align="right">Activities</TableCell>
                    <TableCell align="right">Tasks Done</TableCell>
                    <TableCell align="right">Open Opps</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamPerf.map((row) => (
                    <TableRow key={row.user.id}>
                      <TableCell>{row.user.firstName} {row.user.lastName}</TableCell>
                      <TableCell align="right">{row.wonOpportunities}</TableCell>
                      <TableCell align="right">{formatCurrency(row.wonRevenue)}</TableCell>
                      <TableCell align="right">{row.activitiesLogged}</TableCell>
                      <TableCell align="right">{row.tasksCompleted}</TableCell>
                      <TableCell align="right">{row.openOpportunities}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
}
