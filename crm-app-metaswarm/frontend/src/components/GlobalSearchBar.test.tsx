import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@mui/icons-material/Search', () => ({ default: () => null }));
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GlobalSearchBar } from './GlobalSearchBar';
import * as searchApi from '../api/search';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';

vi.mock('../api/search');
vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const emptyResults = {
  customers: { items: [], total: 0 },
  contacts: { items: [], total: 0 },
  opportunities: { items: [], total: 0 },
  activities: { items: [], total: 0 },
  tasks: { items: [], total: 0 },
  query: '',
  totalResults: 0,
};

function renderBar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter>
          <GlobalSearchBar />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('GlobalSearchBar', () => {
  beforeEach(() => {
    vi.mocked(searchApi.useSearch).mockReturnValue({
      data: emptyResults, isFetching: false,
    } as unknown as ReturnType<typeof searchApi.useSearch>);
  });

  it('renders search input', () => {
    renderBar();
    expect(screen.getByRole('textbox', { name: /global search/i })).toBeInTheDocument();
  });

  it('does not show dropdown for input shorter than 2 chars', async () => {
    renderBar();
    await userEvent.type(screen.getByRole('textbox', { name: /global search/i }), 'a');
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
  });

  it('shows "No results found" when search returns empty', async () => {
    renderBar();
    await userEvent.type(screen.getByRole('textbox', { name: /global search/i }), 'ac');
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('shows result items in dropdown', async () => {
    vi.mocked(searchApi.useSearch).mockReturnValue({
      data: {
        ...emptyResults,
        customers: { items: [{ id: 'c1', type: 'customer', title: 'Acme Corp', subtitle: 'Technology · ACTIVE', url: '/customers/c1' }], total: 1 },
        totalResults: 1,
      },
      isFetching: false,
    } as unknown as ReturnType<typeof searchApi.useSearch>);

    renderBar();
    await userEvent.type(screen.getByRole('textbox', { name: /global search/i }), 'ac');
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
  });

  it('shows "View all results" link when results exist', async () => {
    vi.mocked(searchApi.useSearch).mockReturnValue({
      data: {
        ...emptyResults,
        customers: { items: [{ id: 'c1', type: 'customer', title: 'Acme Corp', subtitle: '', url: '/customers/c1' }], total: 1 },
        totalResults: 1,
      },
      isFetching: false,
    } as unknown as ReturnType<typeof searchApi.useSearch>);

    renderBar();
    await userEvent.type(screen.getByRole('textbox', { name: /global search/i }), 'ac');
    await waitFor(() => {
      expect(screen.getByText(/view all/i)).toBeInTheDocument();
    });
  });
});
