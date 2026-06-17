import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ActivityListPage from './ActivityListPage';
import * as activitiesApi from '../../api/activities';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/activities');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockActivity = {
  id: 'a1', type: 'PHONE_CALL' as const, subject: 'Initial call', description: null,
  scheduledAt: null, durationMinutes: null, customerId: 'cust-1', contactId: null, createdById: 'u1',
  customer: { id: 'cust-1', companyName: 'Acme Corp', ownerId: 'u1' },
  contact: null,
  createdBy: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const adminCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const readOnlyCtx: AuthContextValue = {
  ...adminCtx, user: { ...adminCtx.user!, role: 'READ_ONLY' },
};

function renderPage(authCtx = adminCtx) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter><ActivityListPage /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ActivityListPage', () => {
  beforeEach(() => {
    vi.mocked(activitiesApi.useActivities).mockReturnValue({
      data: { data: [mockActivity], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } },
      isLoading: false,
    } as unknown as ReturnType<typeof activitiesApi.useActivities>);
    mockNavigate.mockClear();
  });

  it('renders activity table', () => {
    renderPage();
    expect(screen.getByText('Initial call')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows New Activity button for admin', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /new activity/i })).toBeInTheDocument();
  });

  it('hides New Activity button for READ_ONLY', () => {
    renderPage(readOnlyCtx);
    expect(screen.queryByRole('button', { name: /new activity/i })).not.toBeInTheDocument();
  });

  it('navigates to /activities/new on button click', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /new activity/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/activities/new');
  });

  it('navigates to activity detail on row click', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Initial call'));
    expect(mockNavigate).toHaveBeenCalledWith('/activities/a1');
  });

  it('shows loading spinner', () => {
    vi.mocked(activitiesApi.useActivities).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof activitiesApi.useActivities>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows No activities found when empty', () => {
    vi.mocked(activitiesApi.useActivities).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      isLoading: false,
    } as unknown as ReturnType<typeof activitiesApi.useActivities>);
    renderPage();
    expect(screen.getByText(/no activities found/i)).toBeInTheDocument();
  });
});
