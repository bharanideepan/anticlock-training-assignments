import { Card, CardContent, Skeleton, Typography } from '@mui/material';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  loading?: boolean;
  valueColor?: string;
}

export default function MetricCard({ title, value, subtitle, loading, valueColor }: MetricCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ p: '12px 16px', '&:last-child': { pb: '12px' } }}>
        <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', fontWeight: 500 }}>
          {title}
        </Typography>
        {loading ? (
          <Skeleton variant="text" sx={{ height: 28, width: 80 }} />
        ) : (
          <Typography variant="h4" sx={{ fontWeight: 700, color: valueColor ?? 'text.primary', lineHeight: 1.2 }}>
            {value}
          </Typography>
        )}
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </CardContent>
    </Card>
  );
}
