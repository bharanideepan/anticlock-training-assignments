import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';

export interface OptionItem {
  id: string;
  label: string;
  subtitle?: string;
}

export interface FetchOptionsResult {
  items: OptionItem[];
  hasMore: boolean;
}

interface AsyncAutocompleteProps {
  label: string;
  value?: string | null;
  onChange: (id: string | null) => void;
  fetchOptions: (search: string, page: number) => Promise<FetchOptionsResult>;
  initialLabel?: string | null;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

export default function AsyncAutocomplete({
  label,
  value,
  onChange,
  fetchOptions,
  initialLabel,
  placeholder,
  error,
  helperText,
  required,
  disabled,
  size = 'small',
  fullWidth = true,
}: AsyncAutocompleteProps) {
  const [selectedOption, setSelectedOption] = useState<OptionItem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef('');
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value → selectedOption (edit mode pre-population and form reset)
  useEffect(() => {
    if (value) {
      if (!selectedOption || selectedOption.id !== value) {
        const lbl = initialLabel ?? value;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedOption({ id: value, label: lbl });
        setInputValue(lbl);
      }
    } else {
      if (selectedOption !== null) {
        setSelectedOption(null);
        setInputValue('');
      }
    }
  }, [value, initialLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = useCallback(
    async (search: string, page: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const { items, hasMore: more } = await fetchOptions(search, page);
        setOptions((prev) => (page === 1 ? items : [...prev, ...items]));
        setHasMore(more);
        pageRef.current = page;
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [fetchOptions],
  );

  const handleOpen = () => {
    setOptions([]);
    pageRef.current = 1;
    searchRef.current = '';
    doSearch('', 1);
  };

  const handleInputChange = (_: React.SyntheticEvent, newInput: string, reason: string) => {
    setInputValue(newInput);
    if (reason === 'input') {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        searchRef.current = newInput;
        pageRef.current = 1;
        setOptions([]);
        doSearch(newInput, 1);
      }, 300);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLElement>) => {
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50 && hasMore && !loadingRef.current) {
      doSearch(searchRef.current, pageRef.current + 1);
    }
  };

  const handleChange = (_: React.SyntheticEvent, option: OptionItem | string | null) => {
    if (typeof option === 'string' || option === null) {
      setSelectedOption(null);
      setInputValue('');
      onChange(null);
    } else {
      setSelectedOption(option);
      setInputValue(option.label);
      onChange(option.id);
    }
  };

  return (
    <Autocomplete
      value={selectedOption}
      inputValue={inputValue}
      onChange={handleChange}
      onInputChange={handleInputChange}
      onOpen={handleOpen}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slotProps={{ listbox: { onScroll: handleScroll } as any }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          required={required}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps?.input,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={14} />}
                  {params.slotProps?.input?.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Typography variant="body2" noWrap>{option.label}</Typography>
            {option.subtitle && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {option.subtitle}
              </Typography>
            )}
          </Box>
        </li>
      )}
    />
  );
}
