import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CircularProgress, Box } from '@mui/material';
import { usePipelineFunnel } from '../../../api/dashboard.api';

const COLORS = ['#1976d2', '#0288d1', '#0097a7', '#00897b'];

export default function PipelineFunnelChart() {
  const { data, isLoading } = usePipelineFunnel();

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (!data) return null;

  const chartData = data.map((item) => ({ name: item.stage, count: item.count, value: Number(item.value) }));

  return (
    <Box sx={{ height: 260, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v, name) => [name === 'count' ? v : `$${Number(v).toLocaleString()}`, name === 'count' ? 'Deals' : 'Value']} />
          <Bar dataKey="count" name="count" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
