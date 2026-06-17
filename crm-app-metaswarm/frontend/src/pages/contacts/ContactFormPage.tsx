import { useEffect } from 'react';
import { Box, Button, CircularProgress, Grid, Paper, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { createContactSchema, updateContactSchema } from '../../shared/schemas/contact.schema';
import type { CreateContactFormValues, UpdateContactFormValues } from '../../shared/schemas/contact.schema';
import { useCreateContact, useUpdateContact, useContact } from '../../api/contacts';

function CreateForm() {
  const navigate = useNavigate();
  const createMutation = useCreateContact();
  const { customerId: prefilledCustomerId } = useParams<{ customerId?: string }>();

  const { register, handleSubmit, formState: { errors } } = useForm<CreateContactFormValues>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { firstName: '', lastName: '', email: '', customerId: prefilledCustomerId ?? '' },
  });

  const onSubmit = async (values: CreateContactFormValues) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
    ) as Record<string, unknown>;
    const contact = await createMutation.mutateAsync(data);
    navigate(`/contacts/${contact.id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>New Contact</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label="First Name *" fullWidth {...register('firstName')}
                error={!!errors.firstName} helperText={errors.firstName?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Last Name *" fullWidth {...register('lastName')}
                error={!!errors.lastName} helperText={errors.lastName?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Email" fullWidth {...register('email')}
                error={!!errors.email} helperText={errors.email?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Phone" fullWidth {...register('phone')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Designation" fullWidth {...register('designation')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Department" fullWidth {...register('department')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Customer ID *" fullWidth {...register('customerId')}
                error={!!errors.customerId} helperText={errors.customerId?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notes" fullWidth multiline rows={3} {...register('notes')} />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Contact'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/contacts')}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

function EditForm({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id);
  const updateMutation = useUpdateContact(id);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateContactFormValues>({
    resolver: zodResolver(updateContactSchema),
  });

  useEffect(() => {
    if (contact) {
      reset({
        firstName: contact.firstName, lastName: contact.lastName,
        email: contact.email ?? '', phone: contact.phone ?? '',
        designation: contact.designation ?? '', department: contact.department ?? '',
        notes: contact.notes ?? '',
      });
    }
  }, [contact, reset]);

  if (isLoading) return <CircularProgress />;
  if (!contact) return null;

  const onSubmit = async (values: UpdateContactFormValues) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    await updateMutation.mutateAsync(data);
    navigate(`/contacts/${id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>Edit Contact</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label="First Name *" fullWidth {...register('firstName')}
                error={!!errors.firstName} helperText={errors.firstName?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Last Name *" fullWidth {...register('lastName')}
                error={!!errors.lastName} helperText={errors.lastName?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Email" fullWidth {...register('email')}
                error={!!errors.email} helperText={errors.email?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Phone" fullWidth {...register('phone')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Designation" fullWidth {...register('designation')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Department" fullWidth {...register('department')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notes" fullWidth multiline rows={3} {...register('notes')} />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/contacts/${id}`)}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default function ContactFormPage() {
  const { id } = useParams<{ id?: string }>();
  return id ? <EditForm id={id} /> : <CreateForm />;
}
