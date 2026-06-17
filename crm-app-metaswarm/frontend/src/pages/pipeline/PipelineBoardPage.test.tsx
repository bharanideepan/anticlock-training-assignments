import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PipelineBoardPage from './PipelineBoardPage';
import * as api from '../../api/opportunities';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/opportunities');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockBoard = {
  data: [
    {
      stage: { id: 's1', name: 'Lead', displayOrder: 1 },
      opportunities: [
        {
          id: 'opp-1', name: 'Big Deal',
          expectedRevenue: '50000.00', expectedCloseDate: '2026-12-31T00:00:00Z',
          owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
        },
      ],
      totalValue: '50000.00',
      count: 1,
    },
    {
      stage: { id: 's2', name: 'Qualified', displayOrder: 2 },
      opportunities: [],
      totalValue: '0.00',
      count: 0,
    },
  ],
};

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter><PipelineBoardPage /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('PipelineBoardPage', () => {
  beforeEach(() => {
    vi.mocked(api.usePipelineBoard).mockReturnValue({
      data: mockBoard, isLoading: false,
    } as unknown as ReturnType<typeof api.usePipelineBoard>);
    mockNavigate.mockClear();
  });

  it('renders pipeline board heading', () => {
    renderPage();
    expect(screen.getByText('Pipeline Board')).toBeInTheDocument();
  });

  it('renders stage columns', () => {
    renderPage();
    expect(screen.getByText('Lead')).toBeInTheDocument();
    expect(screen.getByText('Qualified')).toBeInTheDocument();
  });

  it('renders opportunity card', () => {
    renderPage();
    expect(screen.getByText('Big Deal')).toBeInTheDocument();
  });

  it('shows No opportunities for empty column', () => {
    renderPage();
    expect(screen.getByText(/no opportunities/i)).toBeInTheDocument();
  });

  it('navigates to opportunity detail on card click', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Big Deal'));
    expect(mockNavigate).toHaveBeenCalledWith('/opportunities/opp-1');
  });

  it('shows loading spinner', () => {
    vi.mocked(api.usePipelineBoard).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof api.usePipelineBoard>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
