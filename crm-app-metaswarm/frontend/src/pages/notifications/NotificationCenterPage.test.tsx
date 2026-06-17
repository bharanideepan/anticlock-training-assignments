import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NotificationCenterPage from './NotificationCenterPage';
import * as api from '../../api/notifications';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/notifications');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockNotification = {
  id: 'n1', type: 'TASK_ASSIGNED' as const, title: 'New task assigned', body: 'You have a task',
  resourceType: 'Task', resourceId: 'task-1', isRead: false, readAt: null,
  createdAt: new Date().toISOString(),
};

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const mockMarkRead = { mutate: vi.fn(), isPending: false };
const mockMarkAll = { mutate: vi.fn(), isPending: false };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter><NotificationCenterPage /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('NotificationCenterPage', () => {
  beforeEach(() => {
    vi.mocked(api.useNotifications).mockReturnValue({
      data: {
        data: [mockNotification],
        meta: { total: 1, unreadCount: 1, page: 1, pageSize: 20, totalPages: 1 },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof api.useNotifications>);
    vi.mocked(api.useMarkNotificationRead).mockReturnValue(mockMarkRead as never);
    vi.mocked(api.useMarkAllRead).mockReturnValue(mockMarkAll as never);
    mockNavigate.mockClear();
  });

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('renders notification item', () => {
    renderPage();
    expect(screen.getByText('New task assigned')).toBeInTheDocument();
    expect(screen.getByText('You have a task')).toBeInTheDocument();
  });

  it('shows unread badge', () => {
    renderPage();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('shows mark all as read button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
  });

  it('calls markAllRead on button click', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /mark all as read/i }));
    expect(mockMarkAll.mutate).toHaveBeenCalled();
  });

  it('shows empty state when no notifications', () => {
    vi.mocked(api.useNotifications).mockReturnValue({
      data: { data: [], meta: { total: 0, unreadCount: 0, page: 1, pageSize: 20, totalPages: 0 } },
      isLoading: false,
    } as unknown as ReturnType<typeof api.useNotifications>);
    renderPage();
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    vi.mocked(api.useNotifications).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof api.useNotifications>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
