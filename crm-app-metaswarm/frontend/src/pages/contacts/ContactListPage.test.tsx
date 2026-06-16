import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ContactListPage from './ContactListPage';
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
  phone: '+1-555-0401', designation: 'VP of Sales', department: 'Sales',
  customerId: 'cust-1', customer: { id: 'cust-1', companyName: 'Acme Corp', ownerId: 'u1' },
  _count: { activities: 0, opportunities: 0 },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const adminCtx: AuthContextValue = {
  user: { id: 'admin', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
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
        <MemoryRouter><ContactListPage /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ContactListPage', () => {
  beforeEach(() => {
    vi.mocked(contactsApi.useContacts).mockReturnValue({
      data: { data: [mockContact], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } },
      isLoading: false,
    } as unknown as ReturnType<typeof contactsApi.useContacts>);
    mockNavigate.mockClear();
  });

  it('renders contact table', () => {
    renderPage();
    expect(screen.getByText('Sarah Lee')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows New Contact button for SALES_MANAGER', () => {
    const mgrCtx = { ...adminCtx, user: { ...adminCtx.user!, role: 'SALES_MANAGER' } };
    renderPage(mgrCtx);
    expect(screen.getByRole('button', { name: /new contact/i })).toBeInTheDocument();
  });

  it('hides New Contact button for READ_ONLY', () => {
    renderPage(readOnlyCtx);
    expect(screen.queryByRole('button', { name: /new contact/i })).not.toBeInTheDocument();
  });

  it('navigates to /contacts/new on button click', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /new contact/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contacts/new');
  });

  it('navigates to contact detail on row click', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Sarah Lee'));
    expect(mockNavigate).toHaveBeenCalledWith('/contacts/c1');
  });

  it('shows loading spinner', () => {
    vi.mocked(contactsApi.useContacts).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof contactsApi.useContacts>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows No contacts found when empty', () => {
    vi.mocked(contactsApi.useContacts).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      isLoading: false,
    } as unknown as ReturnType<typeof contactsApi.useContacts>);
    renderPage();
    expect(screen.getByText(/no contacts found/i)).toBeInTheDocument();
  });
});
