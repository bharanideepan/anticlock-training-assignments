import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert, Box, Button, FormControl, InputLabel, MenuItem,
  Paper, Select, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface SsoConfig {
  provider: 'SAML' | 'OIDC' | null;
  entityId?: string;
  idpUrl?: string;
  x509Certificate?: string;
  enabled: boolean;
}

const ssoSchema = z.object({
  provider: z.enum(['SAML', 'OIDC']),
  entityId: z.string().min(1),
  idpUrl: z.string().url(),
  x509Certificate: z.string().min(1),
});
type SsoFormValues = z.infer<typeof ssoSchema>;

function SsoConfigForm() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['sso-config'],
    queryFn: () => apiClient.get<{ data: SsoConfig }>('/auth/sso/config').then((r) => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (dto: SsoFormValues) => apiClient.put('/auth/sso/config', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sso-config'] }),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<SsoFormValues>({
    resolver: zodResolver(ssoSchema),
    defaultValues: { provider: 'SAML', entityId: '', idpUrl: '', x509Certificate: '' },
  });

  useEffect(() => {
    if (data && data.provider) {
      reset({
        provider: data.provider,
        entityId: data.entityId ?? '',
        idpUrl: data.idpUrl ?? '',
        x509Certificate: data.x509Certificate ?? '',
      });
    }
  }, [data, reset]);

  if (isLoading) return null;

  return (
    <Box component="form" onSubmit={handleSubmit((v) => saveMutation.mutate(v))} noValidate>
      <Stack spacing={3}>
        {saveMutation.isSuccess && <Alert severity="success">SSO configuration saved.</Alert>}
        {saveMutation.isError && <Alert severity="error">Failed to save configuration.</Alert>}

        <Controller
          name="provider"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select {...field} label="Provider">
                <MenuItem value="SAML">SAML 2.0</MenuItem>
                <MenuItem value="OIDC">OIDC</MenuItem>
              </Select>
            </FormControl>
          )}
        />

        <TextField
          label="Entity ID / Client ID"
          fullWidth
          {...register('entityId')}
          error={!!errors.entityId}
          helperText={errors.entityId?.message}
        />

        <TextField
          label="IdP SSO URL / Authorization endpoint"
          fullWidth
          {...register('idpUrl')}
          error={!!errors.idpUrl}
          helperText={errors.idpUrl?.message}
        />

        <TextField
          label="x.509 Certificate / Client Secret"
          fullWidth
          multiline
          rows={5}
          {...register('x509Certificate')}
          error={!!errors.x509Certificate}
          helperText={errors.x509Certificate?.message}
          slotProps={{ input: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={saveMutation.isPending}
          sx={{ alignSelf: 'flex-start' }}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save configuration'}
        </Button>
      </Stack>
    </Box>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{p: 2}} >
      <Typography variant="h5" sx={{mb: 3}} >Admin settings</Typography>
      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="General" />
          <Tab label="SSO Configuration" />
        </Tabs>

        <Box sx={{p: 2}} >
          {tab === 0 && (
            <Typography color="text.secondary">General settings will be available in a future release.</Typography>
          )}
          {tab === 1 && <SsoConfigForm />}
        </Box>
      </Paper>
    </Box>
  );
}
