import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box, Button, Chip, CircularProgress, FormControl, InputLabel,
  MenuItem, OutlinedInput, Paper, Select, Stack, TextField, Typography,
} from '@mui/material';
import { useUser, useCreateUser, useUpdateUser } from '../../api/users.api';
import { useTeams } from '../../api/teams.api';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  roleId: z.string().uuid(),
  teamIds: z.array(z.string().uuid()).optional(),
});
type FormValues = z.infer<typeof schema>;

export default function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existingUser, isLoading: loadingUser } = useUser(id ?? '');
  const { data: teamsData } = useTeams({ pageSize: 100 });
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<{ data: { id: string; name: string }[] }>('/roles').then((r) => r.data.data),
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { teamIds: [] },
  });

  useEffect(() => {
    if (existingUser) {
      reset({
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        phone: existingUser.phone ?? '',
        jobTitle: existingUser.jobTitle ?? '',
        roleId: existingUser.role?.id ?? '',
        teamIds: existingUser.teams?.map((t) => t.id) ?? [],
      });
    }
  }, [existingUser, reset]);

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      updateMutation.mutate(
        { id: id!, firstName: values.firstName, lastName: values.lastName, phone: values.phone, jobTitle: values.jobTitle },
        { onSuccess: () => navigate(`/users/${id}`) },
      );
    } else {
      createMutation.mutate(values, { onSuccess: () => navigate('/users') });
    }
  };

  if (isEdit && loadingUser) return <CircularProgress sx={{ m: 4 }} />;

  const teams = teamsData?.data ?? [];
  const roles = rolesData ?? [];

  return (
    <Box sx={{maxWidth: 600, p: 3}} >
      <Typography variant="h5" sx={{mb: 3}} >{isEdit ? 'Edit user' : 'Create user'}</Typography>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            <TextField label="Email" type="email" fullWidth {...register('email')}
              disabled={isEdit} error={!!errors.email} helperText={errors.email?.message} />
            <Stack direction="row" spacing={2}>
              <TextField label="First name" fullWidth {...register('firstName')}
                error={!!errors.firstName} helperText={errors.firstName?.message} />
              <TextField label="Last name" fullWidth {...register('lastName')}
                error={!!errors.lastName} helperText={errors.lastName?.message} />
            </Stack>
            <TextField label="Phone" fullWidth {...register('phone')} />
            <TextField label="Job title" fullWidth {...register('jobTitle')} />

            {!isEdit && (
              <Controller
                name="roleId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.roleId}>
                    <InputLabel>Role</InputLabel>
                    <Select {...field} label="Role">
                      {roles.map((r) => <MenuItem key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
              />
            )}

            <Controller
              name="teamIds"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Teams</InputLabel>
                  <Select
                    {...field}
                    multiple
                    input={<OutlinedInput label="Teams" />}
                    renderValue={(selected) =>
                      (selected as string[]).map((id) => (
                        <Chip key={id} label={teams.find((t) => t.id === id)?.name ?? id} size="small" sx={{ mr: 0.5 }} />
                      ))
                    }
                  >
                    {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
            />

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}>
                {isEdit ? 'Save changes' : 'Create user'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
