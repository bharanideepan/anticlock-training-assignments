import { useEffect } from 'react';
import { Box, Button, CircularProgress, Grid, Paper, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { createOpportunitySchema, updateOpportunitySchema } from '../../shared/schemas/opportunity.schema';
import type { CreateOpportunityFormValues, UpdateOpportunityFormValues } from '../../shared/schemas/opportunity.schema';
import { useCreateOpportunity, useUpdateOpportunity, useOpportunity } from '../../api/opportunities';

function CreateForm() {
  const navigate = useNavigate();
  const createMutation = useCreateOpportunity();

  const { register, handleSubmit, formState: { errors } } = useForm<CreateOpportunityFormValues>({
    resolver: zodResolver(createOpportunitySchema),
    defaultValues: { name: '', customerId: '' },
  });

  const onSubmit = async (values: CreateOpportunityFormValues) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
    ) as Record<string, unknown>;
    const opp = await createMutation.mutateAsync(data);
    navigate(`/opportunities/${opp.id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>New Opportunity</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Name *" fullWidth {...register('name')}
                error={!!errors.name} helperText={errors.name?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Customer ID *" fullWidth {...register('customerId')}
                error={!!errors.customerId} helperText={errors.customerId?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Expected Revenue" fullWidth type="number"
                {...register('expectedRevenue', { valueAsNumber: true })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Probability (%)" fullWidth type="number"
                {...register('probability', { valueAsNumber: true })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Expected Close Date" fullWidth type="date" InputLabelProps={{ shrink: true }}
                {...register('expectedCloseDate')} />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Opportunity'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/opportunities')}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

function EditForm({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: opp, isLoading } = useOpportunity(id);
  const updateMutation = useUpdateOpportunity(id);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateOpportunityFormValues>({
    resolver: zodResolver(updateOpportunitySchema),
  });

  useEffect(() => {
    if (opp) {
      reset({
        name: opp.name,
        probability: opp.probability ?? undefined,
        expectedRevenue: opp.expectedRevenue ? parseFloat(opp.expectedRevenue) : undefined,
        expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '',
      });
    }
  }, [opp, reset]);

  if (isLoading) return <CircularProgress />;
  if (!opp) return null;

  const onSubmit = async (values: UpdateOpportunityFormValues) => {
    const data = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    await updateMutation.mutateAsync(data);
    navigate(`/opportunities/${id}`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>Edit Opportunity</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Name *" fullWidth {...register('name')}
                error={!!errors.name} helperText={errors.name?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Expected Revenue" fullWidth type="number"
                {...register('expectedRevenue', { valueAsNumber: true })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Probability (%)" fullWidth type="number"
                {...register('probability', { valueAsNumber: true })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Expected Close Date" fullWidth type="date" InputLabelProps={{ shrink: true }}
                {...register('expectedCloseDate')} />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={3}>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/opportunities/${id}`)}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default function OpportunityFormPage() {
  const { id } = useParams<{ id?: string }>();
  return id ? <EditForm id={id} /> : <CreateForm />;
}
