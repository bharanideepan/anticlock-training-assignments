import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ActivityDetailPage from './ActivityDetailPage';
import * as activitiesApi from '../../api/activities';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/activities');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockActivity = {
  id: 'a1', type: 'MEETING' as const, subject: 'Team Sync',
  description: 'Weekly meeting', scheduledAt: '2026-06-01T10:00:00Z', durationMinutes: 60,
  customerId: 'cust-1', contactId: null, createdById: 'u1',
  customer: { id: 'cust-1', companyName: 'Acme Corp', ownerId: 'u1' },
  contact: null,
  createdBy: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const mockMutation = {
  mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isPaused: false,
  isSuccess: false, isError: false, isIdle: true, data: undefined, error: null,
  reset: vi.fn(), context: undefined, failureCount: 0, failureReason: null,
  status: 'idle' as const, submittedAt: 0, variables: undefined,
};

const adminCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const readOnlyCtx: AuthContextValue = {
  ...adminCtx, user: { ...adminCtx.user!, id: 'other-user', role: 'READ_ONLY' },
};

function renderPage(authCtx = adminCtx) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/activities/a1']}>
          <Routes>
            <Route path="/activities/:id" element={<ActivityDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ActivityDetailPage', () => {
  beforeEach(() => {
    vi.mocked(activitiesApi.useActivity).mockReturnValue({
      data: mockActivity, isLoading: false,
    } as unknown as ReturnType<typeof activitiesApi.useActivity>);
    vi.mocked(activitiesApi.useDeleteActivity).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof activitiesApi.useDeleteActivity>,
    );
    mockNavigate.mockClear();
    vi.mocked(mockMutation.mutate).mockClear();
  });

  it('renders activity subject', () => {
    renderPage();
    expect(screen.getByText('Team Sync')).toBeInTheDocument();
  });

  it('shows activity type chip', () => {
    renderPage();
    expect(screen.getByText('Meeting')).toBeInTheDocument();
  });

  it('shows description', () => {
    renderPage();
    expect(screen.getByText('Weekly meeting')).toBeInTheDocument();
  });

  it('shows customer name', () => {
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows creator name', () => {
    renderPage();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows Delete button for admin (creator)', () => {
    renderPage(adminCtx);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('hides Delete button for READ_ONLY non-creator', () => {
    renderPage(readOnlyCtx);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('calls delete mutation on Delete button click', async () => {
    renderPage(adminCtx);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockMutation.mutate).toHaveBeenCalled();
  });

  it('shows loading spinner', () => {
    vi.mocked(activitiesApi.useActivity).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof activitiesApi.useActivity>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('returns null when activity is undefined', () => {
    vi.mocked(activitiesApi.useActivity).mockReturnValue({
      data: undefined, isLoading: false,
    } as unknown as ReturnType<typeof activitiesApi.useActivity>);
    renderPage();
    expect(screen.queryByText('Team Sync')).not.toBeInTheDocument();
  });
});
