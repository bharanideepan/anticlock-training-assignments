import { useState, useEffect, useRef } from 'react';
import {
  Autocomplete,
  TextField,
  InputAdornment,
  CircularProgress,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../api/search.api';

const FOOTER_ID = '__view_all__';

interface Option {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
  url?: string;
}

const TYPE_COLOR: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning'> = {
  customers: 'primary',
  contacts: 'secondary',
  opportunities: 'success',
  activities: 'warning',
  tasks: 'default',
};

export default function GlobalSearchBar() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useSearch(inputValue);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        containerRef.current?.querySelector('input')?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setInputValue('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const actualOptions: Option[] = data
    ? [
        ...(data.customers?.items ?? []).map((c) => ({ type: 'customers', id: c.id, label: c.title, subtitle: c.subtitle, url: c.url })),
        ...(data.contacts?.items ?? []).map((c) => ({ type: 'contacts', id: c.id, label: c.title, subtitle: c.subtitle, url: c.url })),
        ...(data.opportunities?.items ?? []).map((o) => ({ type: 'opportunities', id: o.id, label: o.title, subtitle: o.subtitle, url: o.url })),
        ...(data.activities?.items ?? []).map((a) => ({ type: 'activities', id: a.id, label: a.title, subtitle: a.subtitle, url: a.url })),
        ...(data.tasks?.items ?? []).map((t) => ({ type: 'tasks', id: t.id, label: t.title, subtitle: t.subtitle, url: t.url })),
      ]
    : [];

  const footerOption: Option = {
    type: FOOTER_ID,
    id: FOOTER_ID,
    label: `View all results for "${inputValue}"`,
  };

  const options: Option[] =
    inputValue.length >= 2 && actualOptions.length > 0
      ? [...actualOptions, footerOption]
      : actualOptions;

  const handleViewAll = () => {
    if (inputValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`);
      setOpen(false);
      setInputValue('');
    }
  };

  const handleSelect = (_: React.SyntheticEvent, option: Option | string | null) => {
    if (!option || typeof option === 'string') return;
    if (option.id === FOOTER_ID) {
      handleViewAll();
      return;
    }
    if (option.url) navigate(option.url);
    setOpen(false);
    setInputValue('');
  };

  return (
    <Box ref={containerRef} sx={{ width: '100%', maxWidth: 280 }}>
      <Autocomplete
        open={open && inputValue.length >= 2}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.id === FOOTER_ID ? '' : opt.label)}
        filterOptions={(x) => x}
        inputValue={inputValue}
        onInputChange={(_, val) => setInputValue(val)}
        onChange={handleSelect}
        loading={isFetching}
        freeSolo
        sx={{ width: '100%' }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search… (Ctrl+K)"
            size="small"
            variant="outlined"
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps?.input,
                startAdornment: (
                  <InputAdornment position="start">
                    {isFetching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                  </InputAdornment>
                ),
                sx: { bgcolor: 'background.paper', borderRadius: 1 },
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          if (option.id === FOOTER_ID) {
            return (
              <li
                {...props}
                key={FOOTER_ID}
                onClick={handleViewAll}
                style={{ cursor: 'pointer' }}
              >
                <Box sx={{ textAlign: 'center', width: '100%', py: 0.5 }}>
                  <Typography variant="caption" color="primary">
                    View all results for &ldquo;{inputValue}&rdquo;
                  </Typography>
                </Box>
              </li>
            );
          }
          return (
            <li {...props} key={`${option.type}-${option.id}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Chip
                  label={option.type.slice(0, 3).toUpperCase()}
                  size="small"
                  color={TYPE_COLOR[option.type] ?? 'default'}
                  sx={{ fontSize: '0.6rem', height: 18 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>{option.label}</Typography>
                  {option.subtitle && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {option.subtitle}
                    </Typography>
                  )}
                </Box>
              </Box>
            </li>
          );
        }}
      />
    </Box>
  );
}
