import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ContactDetailPage from './ContactDetailPage';
import * as contactsApi from '../../api/contacts';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/contacts');

const mockContact = {
  id: 'c1', firstName: 'Sarah', lastName: 'Lee', email: 'sarah@acme.com',
  phone: '+1-555-0401', designation: 'VP of Sales', department: 'Sales', notes: 'Key decision maker',
  customerId: 'cust-1', customer: { id: 'cust-1', companyName: 'Acme Corp', ownerId: 'u1' },
  _count: { activities: 3, opportunities: 1 },
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
  ...adminCtx, user: { ...adminCtx.user!, role: 'READ_ONLY' },
};

function renderPage(authCtx = adminCtx) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/contacts/c1']}>
          <Routes>
            <Route path="/contacts/:id" element={<ContactDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ContactDetailPage', () => {
  beforeEach(() => {
    vi.mocked(contactsApi.useContact).mockReturnValue({
      data: mockContact, isLoading: false,
    } as unknown as ReturnType<typeof contactsApi.useContact>);
    vi.mocked(contactsApi.useDeleteContact).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof contactsApi.useDeleteContact>,
    );
  });

  it('renders contact name', () => {
    renderPage();
    expect(screen.getByText('Sarah Lee')).toBeInTheDocument();
  });

  it('shows clickable email link', () => {
    renderPage();
    const link = screen.getByRole('link', { name: 'sarah@acme.com' });
    expect(link).toHaveAttribute('href', 'mailto:sarah@acme.com');
  });

  it('shows clickable phone link', () => {
    renderPage();
    const link = screen.getByRole('link', { name: '+1-555-0401' });
    expect(link).toHaveAttribute('href', 'tel:+1-555-0401');
  });

  it('shows activity and opportunity counts', () => {
    renderPage();
    expect(screen.getByText(/activities: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/opportunities: 1/i)).toBeInTheDocument();
  });

  it('shows Delete button for admin', () => {
    renderPage(adminCtx);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('hides Delete button for READ_ONLY', () => {
    renderPage(readOnlyCtx);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('calls delete mutation on Delete button click', async () => {
    renderPage(adminCtx);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockMutation.mutate).toHaveBeenCalled();
  });

  it('returns null when contact is undefined', () => {
    vi.mocked(contactsApi.useContact).mockReturnValue({
      data: undefined, isLoading: false,
    } as unknown as ReturnType<typeof contactsApi.useContact>);
    renderPage();
    expect(screen.queryByText('Sarah Lee')).not.toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    vi.mocked(contactsApi.useContact).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof contactsApi.useContact>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
