import { useState, useCallback } from 'react';
import {
  Box, CircularProgress, Divider, InputBase, List, ListItemButton,
  ListItemText, Paper, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useSearch, type SearchItem } from '../api/search';
import { useDebounce } from '../hooks/useDebounce';

export function GlobalSearchBar() {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const debouncedQ = useDebounce(inputValue, 300);

  const { data, isFetching } = useSearch(debouncedQ, { pageSize: 5 });

  const hasResults = data && data.totalResults > 0;

  const handleSelect = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      setInputValue('');
      navigate(item.url);
    },
    [navigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.length >= 2) {
      setOpen(false);
      navigate(`/search?q=${encodeURIComponent(inputValue)}`);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const allItems = data
    ? [
        ...data.customers.items,
        ...data.contacts.items,
        ...data.opportunities.items,
        ...data.activities.items,
        ...data.tasks.items,
      ].slice(0, 10)
    : [];

  return (
    <Box sx={{ position: 'relative', width: 280 }}>
      <Paper
        variant="outlined"
        sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, borderRadius: 1 }}
      >
        {isFetching ? (
          <CircularProgress size={16} sx={{ mr: 1 }} />
        ) : (
          <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
        )}
        <InputBase
          placeholder="Search…"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(e.target.value.length >= 2);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (inputValue.length >= 2) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          inputProps={{ 'aria-label': 'global search' }}
          sx={{ flex: 1, fontSize: 14 }}
        />
      </Paper>

      {open && debouncedQ.length >= 2 && (
        <Paper
          elevation={4}
          sx={{ position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, zIndex: 1300, maxHeight: 400, overflow: 'auto' }}
        >
          {!hasResults && !isFetching && (
            <Box px={2} py={1.5}>
              <Typography variant="body2" color="text.secondary">No results found</Typography>
            </Box>
          )}

          {hasResults && (
            <List dense disablePadding>
              {allItems.map((item, idx) => (
                <Box key={item.id}>
                  {idx > 0 && allItems[idx - 1].type !== item.type && <Divider />}
                  <ListItemButton onClick={() => handleSelect(item)} sx={{ py: 0.75 }}>
                    <ListItemText
                      primary={item.title}
                      secondary={`${item.type} · ${item.subtitle}`}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                  </ListItemButton>
                </Box>
              ))}
              <Divider />
              <ListItemButton
                onClick={() => {
                  setOpen(false);
                  navigate(`/search?q=${encodeURIComponent(inputValue)}`);
                }}
                sx={{ py: 1, justifyContent: 'center' }}
              >
                <Typography variant="caption" color="primary">
                  View all {data.totalResults} results
                </Typography>
              </ListItemButton>
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}
