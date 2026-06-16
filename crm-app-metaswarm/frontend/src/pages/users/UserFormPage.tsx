import { useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { createUserSchema, updateUserSchema } from '../../shared/schemas/user.schema';
import type { CreateUserFormValues, UpdateUserFormValues } from '../../shared/schemas/user.schema';
import { useUser, useCreateUser, useUpdateUser } from '../../api/users';
import { useTeams } from '../../api/teams';

const ROLE_OPTIONS = [
  { value: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator' },
  { value: 'SALES_MANAGER', label: 'Sales Manager' },
  { value: 'SALES_REPRESENTATIVE', label: 'Sales Representative' },
  { value: 'SUPPORT_REPRESENTATIVE', label: 'Support Representative' },
  { value: 'READ_ONLY', label: 'Read Only' },
];

function CreateForm() {
  const navigate = useNavigate();
  const { data: teamsData } = useTeams({ pageSize: 100 });
  const createUser = useCreateUser();

  const { control, handleSubmit, formState: { errors } } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', firstName: '', lastName: '', phone: '', jobTitle: '', roleId: '', teamIds: [] },
  });

  const onSubmit = handleSubmit(async (values: CreateUserFormValues) => {
    try {
      await createUser.mutateAsync(values);
      navigate('/users');
    } catch {
      // error shown via mutation state
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack spacing={2}>
        <Controller
          name="firstName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="First Name"
              required
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              inputProps={{ 'aria-label': 'First Name' }}
            />
          )}
        />
        <Controller
          name="lastName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Last Name"
              required
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              inputProps={{ 'aria-label': 'Last Name' }}
            />
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email"
              type="email"
              required
              error={!!errors.email}
              helperText={errors.email?.message}
              inputProps={{ 'aria-label': 'Email' }}
            />
          )}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Phone"
              error={!!errors.phone}
              helperText={errors.phone?.message}
              inputProps={{ 'aria-label': 'Phone' }}
            />
          )}
        />
        <Controller
          name="jobTitle"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Job Title"
              error={!!errors.jobTitle}
              helperText={errors.jobTitle?.message}
              inputProps={{ 'aria-label': 'Job Title' }}
            />
          )}
        />
        <Controller
          name="roleId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Role"
              required
              error={!!errors.roleId}
              helperText={errors.roleId?.message}
              inputProps={{ 'aria-label': 'Role' }}
            >
              {ROLE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        {teamsData && (
          <Controller
            name="teamIds"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Teams"
                SelectProps={{ multiple: true }}
                error={!!errors.teamIds}
                helperText={errors.teamIds?.message as string}
                inputProps={{ 'aria-label': 'Teams' }}
              >
                {teamsData.data.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}
        {createUser.error && (
          <Typography color="error" variant="body2">
            {createUser.error.message}
          </Typography>
        )}
        <Box display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={createUser.isPending}>
            Create
          </Button>
          <Button variant="outlined" onClick={() => navigate('/users')} disabled={createUser.isPending}>
            Cancel
          </Button>
        </Box>
      </Stack>
    </form>
  );
}

function EditForm({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: existingUser, isLoading } = useUser(id);
  const updateUser = useUpdateUser(id);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', jobTitle: '' },
  });

  useEffect(() => {
    if (existingUser) {
      reset({
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        phone: existingUser.phone ?? '',
        jobTitle: existingUser.jobTitle ?? '',
      });
    }
  }, [existingUser, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateUser.mutateAsync(values);
      navigate('/users');
    } catch {
      // error shown via mutation state
    }
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack spacing={2}>
        <Controller
          name="firstName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="First Name"
              required
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              inputProps={{ 'aria-label': 'First Name' }}
            />
          )}
        />
        <Controller
          name="lastName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Last Name"
              required
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              inputProps={{ 'aria-label': 'Last Name' }}
            />
          )}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Phone"
              error={!!errors.phone}
              helperText={errors.phone?.message}
              inputProps={{ 'aria-label': 'Phone' }}
            />
          )}
        />
        <Controller
          name="jobTitle"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Job Title"
              error={!!errors.jobTitle}
              helperText={errors.jobTitle?.message}
              inputProps={{ 'aria-label': 'Job Title' }}
            />
          )}
        />
        {updateUser.error && (
          <Typography color="error" variant="body2">
            {updateUser.error.message}
          </Typography>
        )}
        <Box display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={updateUser.isPending}>
            Save
          </Button>
          <Button variant="outlined" onClick={() => navigate('/users')} disabled={updateUser.isPending}>
            Cancel
          </Button>
        </Box>
      </Stack>
    </form>
  );
}

export default function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  return (
    <Box p={3} maxWidth={600}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        {isEdit ? 'Edit User' : 'Create User'}
      </Typography>
      {isEdit ? <EditForm id={id} /> : <CreateForm />}
    </Box>
  );
}
