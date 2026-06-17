import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SearchResultsPage from './SearchResultsPage';
import * as searchApi from '../../api/search';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/search');

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
  query: 'acme',
  totalResults: 0,
};

function renderPage(search = '?q=acme') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={[`/search${search}`]}>
          <Routes>
            <Route path="/search" element={<SearchResultsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('SearchResultsPage', () => {
  beforeEach(() => {
    vi.mocked(searchApi.useSearch).mockReturnValue({
      data: emptyResults, isLoading: false,
    } as unknown as ReturnType<typeof searchApi.useSearch>);
  });

  it('shows query chip', () => {
    renderPage();
    expect(screen.getByText('acme')).toBeInTheDocument();
  });

  it('shows "No results found" when totalResults is 0', () => {
    renderPage();
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('shows prompt when query is too short', () => {
    renderPage('?q=a');
    expect(screen.getByText(/enter at least 2 characters/i)).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    vi.mocked(searchApi.useSearch).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof searchApi.useSearch>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders customer results', () => {
    vi.mocked(searchApi.useSearch).mockReturnValue({
      data: {
        ...emptyResults,
        customers: { items: [{ id: 'c1', type: 'customer', title: 'Acme Corp', subtitle: 'ACTIVE', url: '/customers/c1' }], total: 1 },
        totalResults: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof searchApi.useSearch>);
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText(/customers.*1/i)).toBeInTheDocument();
  });

  it('renders filter tabs', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /customers/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /contacts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /opportunities/i })).toBeInTheDocument();
  });
});
