import { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { useImportCustomers, useImportContacts, getExportUrl } from '../../api/import-export.api';
import type { ImportResult } from '../../api/import-export.api';

const CUSTOMER_CSV_EXAMPLE =
  'companyName,industry,website,status\nAcme Corp,Technology,https://acme.com,PROSPECT\nBeta Inc,Finance,,ACTIVE';

const CONTACT_CSV_EXAMPLE =
  'firstName,lastName,email,phone,designation,department,customerCompanyName\nJohn,Doe,john@acme.com,+1234567890,CTO,Engineering,Acme Corp';

function ImportCard({
  title,
  exampleCsv,
  onImport,
  isPending,
  result,
}: {
  title: string;
  exampleCsv: string;
  onImport: (file: File) => void;
  isPending: boolean;
  result?: ImportResult | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = '';
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{fontWeight: 600, mb: 1}} >{title}</Typography>

      <Typography variant="body2" color="text.secondary" sx={{mb: 1}} >
        Upload a CSV file. Required columns are shown in the example below.
      </Typography>

      <Box component="pre" sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1, fontSize: 11, overflowX: 'auto', mb: 2 }}>
        {exampleCsv}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      <Button
        variant="contained"
        startIcon={<UploadFileIcon />}
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        size="small"
      >
        {isPending ? 'Importing…' : 'Choose CSV & Import'}
      </Button>

      {isPending && <LinearProgress sx={{ mt: 1 }} />}

      {result && (
        <Box sx={{mt: 2}} >
          <Alert severity={result.errors.length > 0 ? 'warning' : 'success'}>
            Imported: {result.imported} · Skipped: {result.skipped}
            {result.errors.length > 0 && ` · ${result.errors.length} error(s)`}
          </Alert>
          {result.errors.length > 0 && (
            <List dense sx={{ maxHeight: 160, overflow: 'auto', mt: 1 }}>
              {result.errors.map((err, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText
                    primary={<Typography variant="caption" color="error">{err}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </Paper>
  );
}

function ExportCard({ entity, label }: { entity: 'customers' | 'contacts'; label: string }) {
  const handleExport = () => {
    const url = getExportUrl(entity);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}-export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{fontWeight: 600, mb: 1}} >{label}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 2}} >
        Export all {label.toLowerCase()} you have access to as a CSV file.
      </Typography>
      <Button variant="outlined" startIcon={<DownloadIcon />} size="small" onClick={handleExport}>
        Export {label}
      </Button>
    </Paper>
  );
}

export default function ImportExportPage() {
  const [tab, setTab] = useState(0);

  const importCustomers = useImportCustomers();
  const importContacts = useImportContacts();

  return (
    <Box sx={{maxWidth: 720, p: 3}} >
      <Typography variant="h5" sx={{mb: 1}} >Import / Export</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 3}} >
        Bulk import customers and contacts from CSV, or export data for external use.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Import" />
        <Tab label="Export" />
      </Tabs>

      {tab === 0 && (
        <Stack sx={{ gap: 2 }}>
          <ImportCard
            title="Import Customers"
            exampleCsv={CUSTOMER_CSV_EXAMPLE}
            onImport={(f) => importCustomers.mutate(f)}
            isPending={importCustomers.isPending}
            result={importCustomers.data}
          />
          <Divider />
          <ImportCard
            title="Import Contacts"
            exampleCsv={CONTACT_CSV_EXAMPLE}
            onImport={(f) => importContacts.mutate(f)}
            isPending={importContacts.isPending}
            result={importContacts.data}
          />
        </Stack>
      )}

      {tab === 1 && (
        <Stack sx={{ gap: 2 }}>
          <ExportCard entity="customers" label="Customers" />
          <ExportCard entity="contacts" label="Contacts" />
        </Stack>
      )}
    </Box>
  );
}
