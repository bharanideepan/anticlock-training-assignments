import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CircularProgress, Box } from '@mui/material';
import { useRevenueTrend } from '../../../api/dashboard.api';

export default function RevenueTrendChart() {
  const { data, isLoading } = useRevenueTrend(6);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (!data) return null;

  const chartData = data.labels.map((label, i) => ({
    month: label,
    wonRevenue: data.wonRevenue[i],
    forecastRevenue: data.forecastRevenue[i],
  }));

  return (
    <Box sx={{ height: 260, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={50} />
          <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="wonRevenue" name="Won Revenue" stroke="#2e7d32" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="forecastRevenue" name="Forecast" stroke="#1976d2" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
