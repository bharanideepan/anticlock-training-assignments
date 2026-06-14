import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Stack, TextField } from '@mui/material';
import type { ReportFilter } from '../../api/reports.api';

const schema = z.object({
  fromDate: z.string().min(1, 'Required'),
  toDate: z.string().min(1, 'Required'),
  ownerId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ReportFiltersProps {
  onApply: (filter: ReportFilter) => void;
}

export default function ReportFilters({ onApply }: ReportFiltersProps) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fromDate: firstOfMonth, toDate: today, ownerId: '' },
  });

  const onSubmit = (values: FormValues) => {
    onApply({
      fromDate: new Date(values.fromDate).toISOString(),
      toDate: new Date(values.toDate + 'T23:59:59').toISOString(),
      ownerId: values.ownerId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Controller
          name="fromDate"
          control={control}
          render={({ field }) => (
            <TextField
              type="date" label="From" size="small" {...field}
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.fromDate} helperText={errors.fromDate?.message}
              sx={{ width: 160 }}
            />
          )}
        />
        <Controller
          name="toDate"
          control={control}
          render={({ field }) => (
            <TextField
              type="date" label="To" size="small" {...field}
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.toDate} helperText={errors.toDate?.message}
              sx={{ width: 160 }}
            />
          )}
        />
        <Button type="submit" variant="contained" size="small">Apply</Button>
      </Stack>
    </form>
  );
}
