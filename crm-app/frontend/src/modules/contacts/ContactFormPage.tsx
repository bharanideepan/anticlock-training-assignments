import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box, Button, CircularProgress, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { useContact, useCreateContact, useUpdateContact } from '../../api/contacts.api';
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

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
  customerId: z.string().uuid(),
});
type FormValues = z.infer<typeof schema>;

type ExistingWithCustomer = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  notes?: string;
  customer?: { id: string; companyName: string };
};

export default function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const defaultCustomerId = searchParams.get('customerId') ?? '';

  const { data: existing, isLoading } = useContact(id ?? '');
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerId: defaultCustomerId },
  });

  const existingTyped = existing as unknown as ExistingWithCustomer | undefined;

  useEffect(() => {
    if (existingTyped) {
      reset({
        firstName: existingTyped.firstName,
        lastName: existingTyped.lastName,
        email: existingTyped.email ?? '',
        phone: existingTyped.phone ?? '',
        designation: existingTyped.designation ?? '',
        department: existingTyped.department ?? '',
        notes: existingTyped.notes ?? '',
        customerId: existingTyped.customer?.id ?? '',
      });
    }
  }, [existingTyped, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, email: values.email || undefined };
    if (isEdit) {
      updateMutation.mutate(
        { id: id!, firstName: payload.firstName, lastName: payload.lastName, email: payload.email, phone: payload.phone, designation: payload.designation, department: payload.department, notes: payload.notes },
        { onSuccess: () => navigate(`/contacts/${id}`) },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: (c) => navigate(`/contacts/${c.id}`) });
    }
  };

  if (isEdit && isLoading) return <CircularProgress sx={{ m: 4 }} />;

  const customerLabel = existingTyped?.customer?.companyName ?? '';

  return (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>{isEdit ? 'Edit contact' : 'Add contact'}</Typography>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="First name *" fullWidth size="small" {...register('firstName')}
                error={!!errors.firstName} helperText={errors.firstName?.message} />
              <TextField label="Last name *" fullWidth size="small" {...register('lastName')}
                error={!!errors.lastName} helperText={errors.lastName?.message} />
            </Stack>
            <TextField label="Email" type="email" fullWidth size="small" {...register('email')}
              error={!!errors.email} helperText={errors.email?.message} />
            <TextField label="Phone" fullWidth size="small" {...register('phone')} />
            <Stack direction="row" spacing={2}>
              <TextField label="Designation" fullWidth size="small" {...register('designation')} />
              <TextField label="Department" fullWidth size="small" {...register('department')} />
            </Stack>
            <TextField label="Notes" fullWidth multiline rows={3} {...register('notes')} />
            {!isEdit && (
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
            )}
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}>
                {isEdit ? 'Save changes' : 'Create contact'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
