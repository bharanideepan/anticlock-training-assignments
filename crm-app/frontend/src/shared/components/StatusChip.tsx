import { Chip, ChipProps } from '@mui/material';
import type { CustomerStatus, TaskStatus, UserStatus } from '../types/api.types';

type Status = CustomerStatus | TaskStatus | UserStatus | string;

const STATUS_COLOR: Record<string, ChipProps['color']> = {
  ACTIVE: 'success',
  PROSPECT: 'info',
  INACTIVE: 'warning',
  ARCHIVED: 'default',
  OPEN: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

interface StatusChipProps {
  status: Status;
  size?: ChipProps['size'];
}

export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  return (
    <Chip
      label={status.replace(/_/g, ' ')}
      color={STATUS_COLOR[status] ?? 'default'}
      size={size}
    />
  );
}
