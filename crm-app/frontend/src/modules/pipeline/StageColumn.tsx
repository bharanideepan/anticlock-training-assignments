import { useDroppable } from '@dnd-kit/core';
import { Box, Paper, Typography } from '@mui/material';
import OpportunityCard from './OpportunityCard';

interface Opportunity {
  id: string;
  name: string;
  expectedRevenue?: string;
  expectedCloseDate?: string;
  owner?: { id: string; firstName: string; lastName: string };
}

interface StageColumnProps {
  stageId: string;
  stageName: string;
  opportunities: Opportunity[];
  totalValue: string;
  stageColor: string;
}

export default function StageColumn({ stageId, stageName, opportunities, totalValue, stageColor }: StageColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stageId });

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        minWidth: 280,
        maxWidth: 300,
        flexShrink: 0,
        p: 2,
        bgcolor: isOver ? 'action.hover' : 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
        borderLeft: `4px solid ${stageColor}`,
      }}
    >
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{stageName}</Typography>
        <Typography variant="caption" color="text.secondary">
          {opportunities.length} deal{opportunities.length !== 1 ? 's' : ''} · ${Number(totalValue).toLocaleString()}
        </Typography>
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            id={opp.id}
            name={opp.name}
            expectedRevenue={opp.expectedRevenue}
            expectedCloseDate={opp.expectedCloseDate}
            owner={opp.owner}
            stageId={stageId}
          />
        ))}
      </Box>
    </Paper>
  );
}
