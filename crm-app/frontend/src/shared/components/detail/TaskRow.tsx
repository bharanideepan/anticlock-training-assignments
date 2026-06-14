import { Box, Chip, ListItemButton, Typography } from '@mui/material';

interface TaskRowProps {
  task: {
    id: string;
    title: string;
    status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
    dueDate?: string;
    isOverdue?: boolean;
    assignee?: { firstName: string; lastName: string };
  };
  onClick: () => void;
}

export default function TaskRow({ task, onClick }: TaskRowProps) {
  const chipColor =
    task.status === 'OPEN' ? 'info' : task.status === 'COMPLETED' ? 'success' : 'default';

  const meta = [
    task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : null,
    task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListItemButton divider onClick={onClick}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
            {task.title}
          </Typography>
          <Chip
            label={task.status}
            size="small"
            color={chipColor as 'info' | 'success' | 'default'}
            sx={{ flexShrink: 0 }}
          />
        </Box>
        {meta && (
          <Typography
            variant="caption"
            color={task.isOverdue ? 'error' : 'text.secondary'}
          >
            {meta}
          </Typography>
        )}
      </Box>
    </ListItemButton>
  );
}
