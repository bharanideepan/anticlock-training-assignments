import { Box, Chip, ListItemButton, Typography } from '@mui/material';

interface OpportunityRowProps {
  opportunity: {
    id: string;
    name: string;
    stage: { name: string; terminalOutcome?: string | null };
    expectedRevenue?: string;
    expectedCloseDate?: string;
    owner?: { firstName: string; lastName: string };
  };
  onClick: () => void;
}

export default function OpportunityRow({ opportunity, onClick }: OpportunityRowProps) {
  const chipColor =
    opportunity.stage.terminalOutcome === 'WON'
      ? 'success'
      : opportunity.stage.terminalOutcome === 'LOST'
      ? 'error'
      : 'default';

  const meta = [
    opportunity.expectedRevenue
      ? `$${Number(opportunity.expectedRevenue).toLocaleString()}`
      : null,
    opportunity.expectedCloseDate
      ? `Close: ${new Date(opportunity.expectedCloseDate).toLocaleDateString()}`
      : null,
    opportunity.owner
      ? `${opportunity.owner.firstName} ${opportunity.owner.lastName}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListItemButton divider onClick={onClick}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {opportunity.name}
          </Typography>
          <Chip
            label={opportunity.stage.name}
            size="small"
            color={chipColor as 'success' | 'error' | 'default'}
            sx={{ flexShrink: 0 }}
          />
        </Box>
        {meta && (
          <Typography variant="caption" color="text.secondary">{meta}</Typography>
        )}
      </Box>
    </ListItemButton>
  );
}
