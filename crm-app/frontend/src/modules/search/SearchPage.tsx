import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSearch } from '../../api/search.api';
import type { SearchResultItem } from '../../api/search.api';

const TYPE_OPTIONS = [
  { value: 'customers', label: 'Customers' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'activities', label: 'Activities' },
  { value: 'tasks', label: 'Tasks' },
];

interface GroupProps {
  label: string;
  items: SearchResultItem[];
  total: number;
  onNavigate: (url: string) => void;
}

function ResultGroup({ label, items, total, onNavigate }: GroupProps) {
  if (!items.length) return null;
  return (
    <Paper variant="outlined">
      <Box sx={{ bgcolor: 'grey.50', px: 2, py: 1 }}>
        <Typography variant="subtitle2">
          {label} <Chip label={total} size="small" sx={{ ml: 1 }} />
        </Typography>
      </Box>
      <Divider />
      <List dense disablePadding>
        {items.map((item) => (
          <ListItemButton key={item.id} onClick={() => onNavigate(item.url)} divider>
            <ListItemText
              primary={item.title}
              secondary={item.subtitle ? <Chip label={item.subtitle} size="small" variant="outlined" /> : undefined}
              slotProps={{ secondary: { component: 'span' } }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [types, setTypes] = useState<string[]>([]);

  const { data, isFetching, isError } = useSearch(query, undefined, 20);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value) setSearchParams({ q: value });
    else setSearchParams({});
  };

  const handleTypeToggle = (_: React.MouseEvent, value: string[]) => setTypes(value);

  const totalResults = data?.totalResults ?? 0;

  const shouldShow = (type: string) => !types.length || types.includes(type);

  return (
    <Box sx={{ maxWidth: 900, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Global Search</Typography>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search customers, contacts, opportunities, activities, tasks..."
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                {isFetching ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          },
        }}
      />

      <ToggleButtonGroup
        value={types}
        onChange={handleTypeToggle}
        size="small"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}
      >
        {TYPE_OPTIONS.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Search failed. Please try again.</Alert>}

      {data && query.length >= 2 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {totalResults} result{totalResults !== 1 ? 's' : ''} for &ldquo;{data.query}&rdquo;
        </Typography>
      )}

      {data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {shouldShow('customers') && (
            <ResultGroup
              label="Customers"
              items={data.customers?.items ?? []}
              total={data.customers?.total ?? 0}
              onNavigate={navigate}
            />
          )}
          {shouldShow('contacts') && (
            <ResultGroup
              label="Contacts"
              items={data.contacts?.items ?? []}
              total={data.contacts?.total ?? 0}
              onNavigate={navigate}
            />
          )}
          {shouldShow('opportunities') && (
            <ResultGroup
              label="Opportunities"
              items={data.opportunities?.items ?? []}
              total={data.opportunities?.total ?? 0}
              onNavigate={navigate}
            />
          )}
          {shouldShow('activities') && (
            <ResultGroup
              label="Activities"
              items={data.activities?.items ?? []}
              total={data.activities?.total ?? 0}
              onNavigate={navigate}
            />
          )}
          {shouldShow('tasks') && (
            <ResultGroup
              label="Tasks"
              items={data.tasks?.items ?? []}
              total={data.tasks?.total ?? 0}
              onNavigate={navigate}
            />
          )}

          {totalResults === 0 && query.length >= 2 && !isFetching && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              No results found for &ldquo;{query}&rdquo;
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
