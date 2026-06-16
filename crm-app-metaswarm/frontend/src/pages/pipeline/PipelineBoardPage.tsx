import { Box, Card, CardContent, CircularProgress, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { usePipelineBoard } from '../../api/opportunities';

function formatRevenue(val?: string): string {
  if (!val) return '';
  const num = parseFloat(val);
  if (num === 0) return '';
  return `$${num.toLocaleString()}`;
}

export default function PipelineBoardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = usePipelineBoard();

  if (isLoading) return <CircularProgress />;

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>Pipeline Board</Typography>

      <Box display="flex" gap={2} overflow="auto" pb={2}>
        {(data?.data ?? []).map((col) => (
          <Box key={col.stage.id} minWidth={280} flexShrink={0}>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" fontWeight={700}>{col.stage.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {col.count} deal{col.count !== 1 ? 's' : ''} · {formatRevenue(col.totalValue) || '$0'}
              </Typography>
            </Paper>

            <Box display="flex" flexDirection="column" gap={1}>
              {col.opportunities.map((opp) => (
                <Card
                  key={opp.id} variant="outlined" sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/opportunities/${opp.id}`)}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="body2" fontWeight={600}>{opp.name}</Typography>
                    {opp.expectedRevenue && (
                      <Typography variant="caption" color="text.secondary">
                        {formatRevenue(opp.expectedRevenue)}
                      </Typography>
                    )}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {opp.owner.firstName} {opp.owner.lastName}
                    </Typography>
                    {opp.expectedCloseDate && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(opp.expectedCloseDate).toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}

              {col.opportunities.length === 0 && (
                <Typography variant="caption" color="text.secondary" textAlign="center" py={2}>
                  No opportunities
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
