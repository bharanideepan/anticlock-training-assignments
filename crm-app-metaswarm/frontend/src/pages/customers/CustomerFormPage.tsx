import { useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { createCustomerSchema, updateCustomerSchema } from '../../shared/schemas/customer.schema';
import type { CreateCustomerFormValues, UpdateCustomerFormValues } from '../../shared/schemas/customer.schema';
import { useCreateCustomer, useUpdateCustomer, useCustomer } from '../../api/customers';

function CreateForm() {
  const navigate = useNavigate();
  const createMutation = useCreateCustomer();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { companyName: '', industry: '', website: '' },
  });

  const onSubmit = async (values: CreateCustomerFormValues) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
    ) as Record<string, unknown>;

    const customer = await createMutation.mutateAsync(data);
    navigate(`/customers/${customer.id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        Create Customer
      </Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Company Name *"
                fullWidth
                {...register('companyName')}
                error={!!errors.companyName}
                helperText={errors.companyName?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Industry" fullWidth {...register('industry')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Website"
                fullWidth
                {...register('website')}
                error={!!errors.website}
                helperText={errors.website?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address Line 1" fullWidth {...register('addressLine1')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="City" fullWidth {...register('city')} />
            </Grid>
            <Grid item xs={3}>
              <TextField label="State" fullWidth {...register('state')} />
            </Grid>
            <Grid item xs={3}>
              <TextField label="Postal Code" fullWidth {...register('postalCode')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Country" fullWidth {...register('country')} />
            </Grid>
          </Grid>

          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Customer'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/customers')}>
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

function EditForm({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const updateMutation = useUpdateCustomer(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateCustomerFormValues>({
    resolver: zodResolver(updateCustomerSchema),
  });

  useEffect(() => {
    if (customer) {
      reset({
        companyName: customer.companyName,
        industry: customer.industry ?? '',
        website: customer.website ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        country: customer.country ?? '',
        postalCode: customer.postalCode ?? '',
        addressLine1: customer.addressLine1 ?? '',
      });
    }
  }, [customer, reset]);

  if (isLoading) return <CircularProgress />;
  if (!customer) return null;

  const onSubmit = async (values: UpdateCustomerFormValues) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;

    await updateMutation.mutateAsync(data);
    navigate(`/customers/${id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        Edit Customer
      </Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Company Name *"
                fullWidth
                {...register('companyName')}
                error={!!errors.companyName}
                helperText={errors.companyName?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Industry" fullWidth {...register('industry')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Website"
                fullWidth
                {...register('website')}
                error={!!errors.website}
                helperText={errors.website?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address Line 1" fullWidth {...register('addressLine1')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="City" fullWidth {...register('city')} />
            </Grid>
            <Grid item xs={3}>
              <TextField label="State" fullWidth {...register('state')} />
            </Grid>
            <Grid item xs={3}>
              <TextField label="Postal Code" fullWidth {...register('postalCode')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Country" fullWidth {...register('country')} />
            </Grid>
          </Grid>

          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/customers/${id}`)}>
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default function CustomerFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  return isEdit ? <EditForm id={id} /> : <CreateForm />;
}
