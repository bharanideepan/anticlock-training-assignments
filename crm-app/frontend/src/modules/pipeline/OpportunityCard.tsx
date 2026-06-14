import { useNavigate } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface OpportunityCardProps {
  id: string;
  name: string;
  expectedRevenue?: string;
  expectedCloseDate?: string;
  owner?: { id: string; firstName: string; lastName: string };
  stageId: string;
  /** When true, renders without drag bindings (used inside DragOverlay clone) */
  isOverlay?: boolean;
}

function CardBody({
  name, expectedRevenue, expectedCloseDate, owner,
}: Pick<OpportunityCardProps, 'name' | 'expectedRevenue' | 'expectedCloseDate' | 'owner'>) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{name}</Typography>
        {(expectedRevenue || expectedCloseDate) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
            {expectedRevenue && (
              <Chip
                icon={<AttachMoneyIcon sx={{ fontSize: 14 }} />}
                label={`$${Number(expectedRevenue).toLocaleString()}`}
                size="small" variant="outlined"
              />
            )}
            {expectedCloseDate && (
              <Chip
                icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />}
                label={new Date(expectedCloseDate).toLocaleDateString()}
                size="small" variant="outlined"
              />
            )}
          </Box>
        )}
        {owner && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {owner.firstName} {owner.lastName}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function OpportunityCard({
  id, name, expectedRevenue, expectedCloseDate, owner, stageId, isOverlay,
}: OpportunityCardProps) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { stageId, name, expectedRevenue, expectedCloseDate, owner },
    disabled: isOverlay,
  });

  if (isOverlay) {
    return (
      <Box sx={{ cursor: 'grabbing', mb: 1, opacity: 0.95, boxShadow: 8 }}>
        <CardBody name={name} expectedRevenue={expectedRevenue} expectedCloseDate={expectedCloseDate} owner={owner} />
      </Box>
    );
  }

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      sx={{ cursor: 'grab', mb: 1, visibility: isDragging ? 'hidden' : 'visible' }}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) navigate(`/opportunities/${id}`); }}
    >
      <CardBody name={name} expectedRevenue={expectedRevenue} expectedCloseDate={expectedCloseDate} owner={owner} />
    </Box>
  );
}
