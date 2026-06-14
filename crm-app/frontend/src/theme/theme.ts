import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
    background: { default: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 13,
    body1: { fontSize: '0.8125rem' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.6875rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1.125rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    subtitle1: { fontSize: '0.875rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.8125rem' },
    button: { fontSize: '0.8125rem' },
  },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 768, lg: 1024, xl: 1280 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8 },
        sizeSmall: { minHeight: 28, fontSize: '0.8125rem' },
        sizeMedium: { minHeight: 32, fontSize: '0.8125rem' },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 12, '&:last-child': { paddingBottom: 12 } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { minHeight: 34, paddingTop: 4, paddingBottom: 4, paddingLeft: 12, paddingRight: 12 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#fafafa',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#555',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '6px 12px',
          fontSize: '0.8125rem',
        },
        head: {
          padding: '8px 12px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6 },
      },
    },
  },
});
