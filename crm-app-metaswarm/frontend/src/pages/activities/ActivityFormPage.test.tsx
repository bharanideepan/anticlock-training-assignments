import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ActivityFormPage from './ActivityFormPage';
import * as activitiesApi from '../../api/activities';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/activities');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockActivity = {
  id: 'a1', type: 'MEETING' as const, subject: 'Team Sync', description: 'Weekly',
  scheduledAt: null, durationMinutes: null, customerId: 'cust-1', contactId: null, createdById: 'u1',
  customer: { id: 'cust-1', companyName: 'Acme Corp', ownerId: 'u1' },
  contact: null,
  createdBy: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

function makeMutation(overrides = {}) {
  return {
    mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(mockActivity), isPending: false,
    isPaused: false, isSuccess: false, isError: false, isIdle: true, data: undefined,
    error: null, reset: vi.fn(), context: undefined, failureCount: 0, failureReason: null,
    status: 'idle' as const, submittedAt: 0, variables: undefined, ...overrides,
  };
}

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

function renderCreatePage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/activities/new']}>
          <Routes><Route path="/activities/new" element={<ActivityFormPage />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function renderEditPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/activities/a1/edit']}>
          <Routes><Route path="/activities/:id/edit" element={<ActivityFormPage />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ActivityFormPage — Create', () => {
  beforeEach(() => {
    vi.mocked(activitiesApi.useCreateActivity).mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof activitiesApi.useCreateActivity>,
    );
    mockNavigate.mockClear();
  });

  it('renders Create Activity heading', () => {
    renderCreatePage();
    expect(screen.getByRole('heading', { name: 'Create Activity' })).toBeInTheDocument();
  });

  it('shows validation error for missing subject', async () => {
    renderCreatePage();
    const subjectInput = screen.getByLabelText(/subject \*/i);
    await userEvent.clear(subjectInput);
    await userEvent.click(screen.getByRole('button', { name: /create activity/i }));
    await waitFor(() => {
      expect(screen.getByText('Subject is required')).toBeInTheDocument();
    });
  });
});

describe('ActivityFormPage — Edit', () => {
  beforeEach(() => {
    vi.mocked(activitiesApi.useActivity).mockReturnValue({
      data: mockActivity, isLoading: false,
    } as unknown as ReturnType<typeof activitiesApi.useActivity>);
    vi.mocked(activitiesApi.useUpdateActivity).mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof activitiesApi.useUpdateActivity>,
    );
    mockNavigate.mockClear();
  });

  it('renders Edit Activity heading', () => {
    renderEditPage();
    expect(screen.getByRole('heading', { name: 'Edit Activity' })).toBeInTheDocument();
  });

  it('pre-populates with existing subject', async () => {
    renderEditPage();
    await waitFor(() => {
      const input = screen.getByDisplayValue('Team Sync');
      expect(input).toBeInTheDocument();
    });
  });

  it('submits and navigates to activity detail', async () => {
    renderEditPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/activities/a1');
    });
  });

  it('returns null when activity is undefined', () => {
    vi.mocked(activitiesApi.useActivity).mockReturnValue({
      data: undefined, isLoading: false,
    } as unknown as ReturnType<typeof activitiesApi.useActivity>);
    renderEditPage();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });
});
