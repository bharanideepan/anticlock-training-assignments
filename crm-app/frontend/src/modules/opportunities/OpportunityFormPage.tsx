import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box, Button, CircularProgress, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { useOpportunity, useCreateOpportunity, useUpdateOpportunity } from '../../api/opportunities.api';
import { apiClient } from '../../api/client';
import AsyncAutocomplete from '../../shared/components/AsyncAutocomplete';

async function fetchCustomerOptions(search: string, page: number) {
  const { data } = await apiClient.get<{
    data: { id: string; companyName: string; status: string }[];
    meta: { totalPages: number };
  }>('/customers', { params: { search, page, pageSize: 10 } });
  return {
    items: data.data.map((c) => ({ id: c.id, label: c.companyName, subtitle: c.status })),
    hasMore: page < data.meta.totalPages,
  };
}

async function fetchContactOptions(search: string, page: number) {
  const { data } = await apiClient.get<{
    data: { id: string; firstName: string; lastName: string; email?: string }[];
    meta: { totalPages: number };
  }>('/contacts', { params: { search, page, pageSize: 10 } });
  return {
    items: data.data.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}`, subtitle: c.email })),
    hasMore: page < data.meta.totalPages,
  };
}

async function fetchUserOptions(search: string, page: number) {
  const { data } = await apiClient.get<{
    data: { id: string; firstName: string; lastName: string; email: string }[];
    meta: { totalPages: number };
  }>('/users', { params: { search, page, pageSize: 10 } });
  return {
    items: data.data.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName}`, subtitle: u.email })),
    hasMore: page < data.meta.totalPages,
  };
}

const schema = z.object({
  name: z.string().min(1),
  customerId: z.string().uuid(),
  contactId: z.string().uuid().optional().or(z.literal('')),
  ownerId: z.string().uuid().optional().or(z.literal('')),
  expectedRevenue: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

type ExistingWithRefs = {
  customer?: { id: string; companyName: string };
  contact?: { id: string; firstName: string; lastName: string };
  owner?: { id: string; firstName: string; lastName: string };
  name: string;
  expectedRevenue?: string | null;
  probability?: number | null;
  expectedCloseDate?: string | null;
};

export default function OpportunityFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const defaultCustomerId = searchParams.get('customerId') ?? '';

  const { data: existing, isLoading } = useOpportunity(id ?? '');
  const createMutation = useCreateOpportunity();
  const updateMutation = useUpdateOpportunity();

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { customerId: defaultCustomerId },
  });

  const existingTyped = existing as unknown as ExistingWithRefs | undefined;

  useEffect(() => {
    if (existingTyped) {
      reset({
        name: existingTyped.name,
        customerId: existingTyped.customer?.id ?? '',
        contactId: existingTyped.contact?.id ?? '',
        ownerId: existingTyped.owner?.id ?? '',
        expectedRevenue: existingTyped.expectedRevenue != null ? Number(existingTyped.expectedRevenue) : undefined,
        probability: existingTyped.probability ?? undefined,
        expectedCloseDate: existingTyped.expectedCloseDate ? existingTyped.expectedCloseDate.split('T')[0] : '',
      });
    }
  }, [existingTyped, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      contactId: values.contactId || undefined,
      ownerId: values.ownerId || undefined,
      expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate).toISOString() : undefined,
    };
    if (isEdit) {
      updateMutation.mutate({ id: id!, ...payload }, { onSuccess: () => navigate(`/opportunities/${id}`) });
    } else {
      createMutation.mutate(payload, { onSuccess: (o) => navigate(`/opportunities/${o.id}`) });
    }
  };

  if (isEdit && isLoading) return <CircularProgress sx={{ m: 4 }} />;

  const customerLabel = existingTyped?.customer?.companyName ?? '';
  const contactLabel = existingTyped?.contact
    ? `${existingTyped.contact.firstName} ${existingTyped.contact.lastName}`
    : '';
  const ownerLabel = existingTyped?.owner
    ? `${existingTyped.owner.firstName} ${existingTyped.owner.lastName}`
    : '';

  return (
    <Box sx={{ maxWidth: 700, p: 2 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>{isEdit ? 'Edit opportunity' : 'Add opportunity'}</Typography>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            <TextField label="Name *" fullWidth {...register('name')}
              error={!!errors.name} helperText={errors.name?.message} size="small" />

            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <AsyncAutocomplete
                  label="Customer *"
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? '')}
                  fetchOptions={fetchCustomerOptions}
                  initialLabel={customerLabel || undefined}
                  error={!!errors.customerId}
                  helperText={errors.customerId?.message}
                  required
                />
              )}
            />

            <Controller
              name="contactId"
              control={control}
              render={({ field }) => (
                <AsyncAutocomplete
                  label="Contact"
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? '')}
                  fetchOptions={fetchContactOptions}
                  initialLabel={contactLabel || undefined}
                />
              )}
            />

            <Controller
              name="ownerId"
              control={control}
              render={({ field }) => (
                <AsyncAutocomplete
                  label="Owner (defaults to you)"
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? '')}
                  fetchOptions={fetchUserOptions}
                  initialLabel={ownerLabel || undefined}
                />
              )}
            />

            <Stack direction="row" spacing={2}>
              <TextField label="Expected revenue ($)" type="number" fullWidth size="small"
                {...register('expectedRevenue')} />
              <TextField label="Probability (%)" type="number" fullWidth size="small"
                {...register('probability')} slotProps={{ input: { inputProps: { min: 0, max: 100 } } }} />
            </Stack>

            <TextField label="Expected close date" type="date" fullWidth size="small"
              {...register('expectedCloseDate')}
              slotProps={{ inputLabel: { shrink: true } }} />

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}>
                {isEdit ? 'Save changes' : 'Create opportunity'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
