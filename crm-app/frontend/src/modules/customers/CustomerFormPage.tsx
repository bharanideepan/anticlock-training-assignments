import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box, Button, FormControl, InputLabel, MenuItem,
  Paper, Select, Stack, TextField, Typography, CircularProgress,
} from '@mui/material';
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '../../api/customers.api';

const REVENUE_RANGES = ['UNDER_1M', '1M_10M', '10M_50M', '50M_100M', 'OVER_100M'];

const schema = z.object({
  companyName: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  revenueRange: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing, isLoading } = useCustomer(id ?? '');
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (existing) {
      reset({
        companyName: existing.companyName,
        industry: existing.industry ?? '',
        website: existing.website ?? '',
        revenueRange: existing.revenueRange ?? '',
        city: existing.city ?? '',
        state: existing.state ?? '',
        country: existing.country ?? '',
        postalCode: existing.postalCode ?? '',
      });
    }
  }, [existing, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      website: values.website || undefined,
      revenueRange: values.revenueRange || undefined,
    };
    if (isEdit) {
      updateMutation.mutate({ id: id!, ...payload }, { onSuccess: () => navigate(`/customers/${id}`) });
    } else {
      createMutation.mutate(payload, { onSuccess: (c) => navigate(`/customers/${c.id}`) });
    }
  };

  if (isEdit && isLoading) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box sx={{maxWidth: 700, p: 3}} >
      <Typography variant="h5" sx={{mb: 3}} >{isEdit ? 'Edit customer' : 'Add customer'}</Typography>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            <TextField label="Company name *" fullWidth {...register('companyName')}
              error={!!errors.companyName} helperText={errors.companyName?.message} />
            <Stack direction="row" spacing={2}>
              <TextField label="Industry" fullWidth {...register('industry')} />
              <TextField label="Website" fullWidth {...register('website')}
                error={!!errors.website} helperText={errors.website?.message} />
            </Stack>

            <Controller
              name="revenueRange"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Revenue range</InputLabel>
                  <Select {...field} label="Revenue range" value={field.value ?? ''}>
                    <MenuItem value="">Not specified</MenuItem>
                    {REVENUE_RANGES.map((r) => (
                      <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <TextField label="Address" fullWidth {...register('addressLine1')} />
            <Stack direction="row" spacing={2}>
              <TextField label="City" fullWidth {...register('city')} />
              <TextField label="State" fullWidth {...register('state')} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Country" fullWidth {...register('country')} />
              <TextField label="Postal code" fullWidth {...register('postalCode')} />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}>
                {isEdit ? 'Save changes' : 'Create customer'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
