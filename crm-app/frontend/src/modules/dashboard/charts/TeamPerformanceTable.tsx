import {
  Table, TableBody, TableCell, TableHead, TableRow,
  Typography, CircularProgress, Box, LinearProgress,
} from '@mui/material';
import { useTeamPerformance } from '../../../api/dashboard.api';

export default function TeamPerformanceTable() {
  const { data, isLoading } = useTeamPerformance();

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (!data?.length) return <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>No performance data available.</Typography>;

  const maxRevenue = Math.max(...data.map((r) => Number(r.wonRevenue)), 1);

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: 28 }}>#</TableCell>
          <TableCell>Rep</TableCell>
          <TableCell align="right">Won</TableCell>
          <TableCell align="right">Revenue</TableCell>
          <TableCell sx={{ minWidth: 100 }}>Performance</TableCell>
          <TableCell align="right">Tasks</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, idx) => {
          const pct = Math.round((Number(row.wonRevenue) / maxRevenue) * 100);
          return (
            <TableRow key={row.user.id}>
              <TableCell sx={{ color: 'text.disabled', fontWeight: 600 }}>{idx + 1}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {row.user.firstName} {row.user.lastName}
                </Typography>
              </TableCell>
              <TableCell align="right">{row.wonOpportunities}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                ${Number(row.wonRevenue).toLocaleString()}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    color={pct >= 75 ? 'success' : pct >= 40 ? 'primary' : 'warning'}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                    {pct}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right">{row.tasksCompleted}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
