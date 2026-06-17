import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Chip, CircularProgress, Divider, List, ListItemButton, ListItemText,
  Paper, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import { useSearch, type SearchGroup } from '../../api/search';

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Customers', value: 'customer' },
  { label: 'Contacts', value: 'contact' },
  { label: 'Opportunities', value: 'opportunity' },
  { label: 'Activities', value: 'activity' },
  { label: 'Tasks', value: 'task' },
] as const;

function ResultGroup({ group, label }: { group: SearchGroup; label: string }) {
  if (group.items.length === 0) return null;

  return (
    <Box mb={3}>
      <Typography variant="subtitle2" color="text.secondary" mb={1}>
        {label} ({group.total})
      </Typography>
      <Paper variant="outlined">
        <List dense disablePadding>
          {group.items.map((item, idx) => (
            <Box key={item.id}>
              {idx > 0 && <Divider />}
              <ListItemButton component={Link} to={item.url} sx={{ py: 1 }}>
                <ListItemText
                  primary={item.title}
                  secondary={item.subtitle}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItemButton>
            </Box>
          ))}
        </List>
      </Paper>
    </Box>
  );
}

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') ?? '';
  const activeTab = searchParams.get('type') ?? 'all';

  const typesParam = activeTab === 'all' ? undefined : activeTab;
  const { data, isLoading } = useSearch(q, { types: typesParam, pageSize: 20 });

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (newValue === 'all') {
      next.delete('type');
    } else {
      next.set('type', newValue);
    }
    setSearchParams(next);
  };

  if (!q || q.length < 2) {
    return (
      <Box p={4}>
        <Typography color="text.secondary">Enter at least 2 characters to search.</Typography>
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={900}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Typography variant="h5">Search results for</Typography>
        <Chip label={q} onDelete={() => navigate('/search')} />
        {data && (
          <Typography variant="body2" color="text.secondary">
            {data.totalResults} results
          </Typography>
        )}
      </Stack>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        {TABS.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
      </Tabs>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && data && data.totalResults === 0 && (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">No results found for &quot;{q}&quot;</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Try broadening your search or using different keywords.
          </Typography>
        </Box>
      )}

      {!isLoading && data && data.totalResults > 0 && (
        <>
          {(activeTab === 'all' || activeTab === 'customer') && (
            <ResultGroup group={data.customers} label="Customers" />
          )}
          {(activeTab === 'all' || activeTab === 'contact') && (
            <ResultGroup group={data.contacts} label="Contacts" />
          )}
          {(activeTab === 'all' || activeTab === 'opportunity') && (
            <ResultGroup group={data.opportunities} label="Opportunities" />
          )}
          {(activeTab === 'all' || activeTab === 'activity') && (
            <ResultGroup group={data.activities} label="Activities" />
          )}
          {(activeTab === 'all' || activeTab === 'task') && (
            <ResultGroup group={data.tasks} label="Tasks" />
          )}
        </>
      )}
    </Box>
  );
}
