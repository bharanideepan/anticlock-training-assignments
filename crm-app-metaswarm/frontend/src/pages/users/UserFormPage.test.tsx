import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserFormPage from './UserFormPage';
import * as usersApi from '../../api/users';
import * as teamsApi from '../../api/teams';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/users');
vi.mock('../../api/teams');

const mockUser = {
  id: 'u1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '+1-555-0200',
  jobTitle: 'Sales Rep',
  status: 'ACTIVE' as const,
  role: { id: 'r1', name: 'SALES_REPRESENTATIVE' },
  teams: [{ id: 't1', name: 'East Sales' }],
  createdAt: '2026-01-15T10:00:00Z',
};

const mockTeamsResponse = {
  data: [{ id: 't1', name: 'East Sales', description: '', memberCount: 3 }],
  meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
};

const mockMutation = (mutateAsync = vi.fn()) => ({
  mutateAsync,
  mutate: vi.fn(),
  isPending: false,
  isPaused: false,
  error: null,
  data: undefined,
  isSuccess: false,
  isError: false,
  isIdle: true,
  reset: vi.fn(),
  status: 'idle' as const,
  variables: undefined,
  context: undefined,
  failureCount: 0,
  failureReason: null,
  submittedAt: 0,
});

const makeWrapper = (path = '/users/new', initialEntry = '/users/new') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ctx: AuthContextValue = {
    user: { id: 'admin', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', role: 'SYSTEM_ADMINISTRATOR' },
    accessToken: 'tok',
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  };
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={ctx}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path={path} element={children} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
};

describe('UserFormPage — create mode', () => {
  const mockCreateMutateAsync = vi.fn().mockResolvedValue(mockUser);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teamsApi.useTeams).mockReturnValue({
      data: mockTeamsResponse,
      isLoading: false,
    } as ReturnType<typeof teamsApi.useTeams>);
    vi.mocked(usersApi.useUser).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof usersApi.useUser>);
    vi.mocked(usersApi.useCreateUser).mockReturnValue(
      mockMutation(mockCreateMutateAsync) as unknown as ReturnType<typeof usersApi.useCreateUser>,
    );
    vi.mocked(usersApi.useUpdateUser).mockReturnValue(
      mockMutation() as unknown as ReturnType<typeof usersApi.useUpdateUser>,
    );
  });

  it('renders create user heading', () => {
    render(<UserFormPage />, { wrapper: makeWrapper() });

    expect(screen.getByText(/create user/i)).toBeInTheDocument();
  });

  it('renders required form fields', () => {
    render(<UserFormPage />, { wrapper: makeWrapper() });

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows validation error when first name is empty on submit', async () => {
    render(<UserFormPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when email is empty on submit', async () => {
    render(<UserFormPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
});

describe('UserFormPage — edit mode', () => {
  const mockUpdateMutateAsync = vi.fn().mockResolvedValue({ ...mockUser, firstName: 'Janet' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teamsApi.useTeams).mockReturnValue({
      data: mockTeamsResponse,
      isLoading: false,
    } as ReturnType<typeof teamsApi.useTeams>);
    vi.mocked(usersApi.useUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as ReturnType<typeof usersApi.useUser>);
    vi.mocked(usersApi.useCreateUser).mockReturnValue(
      mockMutation() as unknown as ReturnType<typeof usersApi.useCreateUser>,
    );
    vi.mocked(usersApi.useUpdateUser).mockReturnValue(
      mockMutation(mockUpdateMutateAsync) as unknown as ReturnType<typeof usersApi.useUpdateUser>,
    );
  });

  it('renders edit user heading', () => {
    render(<UserFormPage />, { wrapper: makeWrapper('/users/:id/edit', '/users/u1/edit') });

    expect(screen.getByText(/edit user/i)).toBeInTheDocument();
  });

  it('pre-populates form with existing user data', async () => {
    render(<UserFormPage />, { wrapper: makeWrapper('/users/:id/edit', '/users/u1/edit') });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });
  });

  it('does not show email field in edit mode', () => {
    render(<UserFormPage />, { wrapper: makeWrapper('/users/:id/edit', '/users/u1/edit') });

    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('calls updateUser.mutateAsync on save', async () => {
    render(<UserFormPage />, { wrapper: makeWrapper('/users/:id/edit', '/users/u1/edit') });
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    });

    const firstNameInput = screen.getByDisplayValue('Jane');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Janet');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Janet' }),
      );
    });
  });
});
