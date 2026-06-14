import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CircularProgress, Box } from '@mui/material';
import { useActivityTrend } from '../../../api/dashboard.api';

export default function ActivityTrendChart() {
  const { data, isLoading } = useActivityTrend(14);

  if (isLoading) return <Box sx={{display: "flex", justifyContent: "center", p: 4}} ><CircularProgress /></Box>;
  if (!data) return null;

  const chartData = data.labels.map((label, i) => ({
    day: label.slice(5),
    Call: data.phoneCall[i],
    Meeting: data.meeting[i],
    Email: data.email[i],
    Note: data.note[i],
    'Follow-up': data.followUp[i],
  }));

  return (
    <Box sx={{ height: 260, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Call" stackId="a" fill="#1976d2" />
          <Bar dataKey="Meeting" stackId="a" fill="#7b1fa2" />
          <Bar dataKey="Email" stackId="a" fill="#0288d1" />
          <Bar dataKey="Note" stackId="a" fill="#f57c00" />
          <Bar dataKey="Follow-up" stackId="a" fill="#2e7d32" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
