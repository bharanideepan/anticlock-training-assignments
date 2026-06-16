import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ContactFormPage from './ContactFormPage';
import * as contactsApi from '../../api/contacts';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/contacts');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockContact = {
  id: 'c1', firstName: 'Sarah', lastName: 'Lee', email: 'sarah@acme.com',
  phone: '+1-555-0401', designation: 'VP of Sales', department: 'Sales', notes: '',
  customerId: 'cust-1', customer: { id: 'cust-1', companyName: 'Acme Corp', ownerId: 'u1' },
  _count: { activities: 0, opportunities: 0 },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

function makeMutation(overrides = {}) {
  return {
    mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(mockContact), isPending: false,
    isPaused: false, isSuccess: false, isError: false, isIdle: true, data: undefined,
    error: null, reset: vi.fn(), context: undefined, failureCount: 0, failureReason: null,
    status: 'idle' as const, submittedAt: 0, variables: undefined, ...overrides,
  };
}

const authCtx: AuthContextValue = {
  user: { id: 'admin', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

function renderCreatePage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/contacts/new']}>
          <Routes><Route path="/contacts/new" element={<ContactFormPage />} /></Routes>
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
        <MemoryRouter initialEntries={['/contacts/c1/edit']}>
          <Routes><Route path="/contacts/:id/edit" element={<ContactFormPage />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ContactFormPage — Create', () => {
  beforeEach(() => {
    vi.mocked(contactsApi.useCreateContact).mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof contactsApi.useCreateContact>,
    );
    mockNavigate.mockClear();
  });

  it('renders New Contact heading', () => {
    renderCreatePage();
    expect(screen.getByRole('heading', { name: 'New Contact' })).toBeInTheDocument();
  });

  it('shows validation error for missing first name', async () => {
    renderCreatePage();
    await userEvent.click(screen.getByRole('button', { name: /create contact/i }));
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });
  });
});

describe('ContactFormPage — Edit', () => {
  beforeEach(() => {
    vi.mocked(contactsApi.useContact).mockReturnValue({
      data: mockContact, isLoading: false,
    } as unknown as ReturnType<typeof contactsApi.useContact>);
    vi.mocked(contactsApi.useUpdateContact).mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof contactsApi.useUpdateContact>,
    );
    mockNavigate.mockClear();
  });

  it('renders Edit Contact heading', () => {
    renderEditPage();
    expect(screen.getByRole('heading', { name: 'Edit Contact' })).toBeInTheDocument();
  });

  it('pre-populates with existing data', async () => {
    renderEditPage();
    await waitFor(() => {
      const input = screen.getAllByRole('textbox')[0] as HTMLInputElement;
      expect(input.value).toBe('Sarah');
    });
  });

  it('submits and navigates to contact detail', async () => {
    renderEditPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/contacts/c1');
    });
  });

  it('returns null when contact is undefined', () => {
    vi.mocked(contactsApi.useContact).mockReturnValue({
      data: undefined, isLoading: false,
    } as unknown as ReturnType<typeof contactsApi.useContact>);
    renderEditPage();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });
});
