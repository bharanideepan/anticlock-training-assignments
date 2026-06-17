import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CustomerFormPage from './CustomerFormPage';
import * as customersApi from '../../api/customers';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/customers');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCustomer = {
  id: 'c1',
  companyName: 'Acme Corp',
  industry: 'Technology',
  website: 'https://acme.com',
  city: 'Austin',
  state: 'TX',
  country: 'US',
  postalCode: '78701',
  addressLine1: '100 Main St',
  status: 'ACTIVE' as const,
  ownerId: 'u1',
  owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeMutation(overrides = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(mockCustomer),
    isPending: false,
    isPaused: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    data: undefined,
    error: null,
    reset: vi.fn(),
    context: undefined,
    failureCount: 0,
    failureReason: null,
    status: 'idle' as const,
    submittedAt: 0,
    variables: undefined,
    ...overrides,
  };
}

const authCtx: AuthContextValue = {
  user: {
    id: 'admin',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'SYSTEM_ADMINISTRATOR',
  },
  accessToken: 'tok',
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
};

function renderCreatePage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/customers/new']}>
          <Routes>
            <Route path="/customers/new" element={<CustomerFormPage />} />
          </Routes>
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
        <MemoryRouter initialEntries={['/customers/c1/edit']}>
          <Routes>
            <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('CustomerFormPage — Create', () => {
  beforeEach(() => {
    vi.mocked(customersApi.useCreateCustomer).mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof customersApi.useCreateCustomer>,
    );
    mockNavigate.mockClear();
  });

  it('renders Create Customer heading', () => {
    renderCreatePage();
    expect(screen.getByRole('heading', { name: 'Create Customer' })).toBeInTheDocument();
  });

  it('shows validation error when Company Name is empty', async () => {
    renderCreatePage();
    await userEvent.click(screen.getByRole('button', { name: /create customer/i }));
    await waitFor(() => {
      expect(screen.getByText('Company name is required')).toBeInTheDocument();
    });
  });

  it('submits form and navigates to detail page', async () => {
    renderCreatePage();
    await userEvent.type(screen.getByLabelText(/company name/i), 'Acme Corp');
    await userEvent.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/customers/c1');
    });
  });
});

describe('CustomerFormPage — Edit', () => {
  beforeEach(() => {
    vi.mocked(customersApi.useCustomer).mockReturnValue({
      data: mockCustomer,
      isLoading: false,
    } as unknown as ReturnType<typeof customersApi.useCustomer>);

    vi.mocked(customersApi.useUpdateCustomer).mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof customersApi.useUpdateCustomer>,
    );
    mockNavigate.mockClear();
  });

  it('renders Edit Customer heading', () => {
    renderEditPage();
    expect(screen.getByText('Edit Customer')).toBeInTheDocument();
  });

  it('pre-populates form with existing customer data', async () => {
    renderEditPage();
    await waitFor(() => {
      const input = screen.getByLabelText(/company name/i) as HTMLInputElement;
      expect(input.value).toBe('Acme Corp');
    });
  });

  it('submits and navigates to detail page', async () => {
    renderEditPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/customers/c1');
    });
  });

  it('returns null when customer is undefined', () => {
    vi.mocked(customersApi.useCustomer).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof customersApi.useCustomer>);

    renderEditPage();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });
});
