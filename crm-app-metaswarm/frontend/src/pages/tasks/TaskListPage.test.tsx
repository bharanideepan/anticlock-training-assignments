import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TaskListPage from './TaskListPage';
import * as tasksApi from '../../api/tasks';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/tasks');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockTask = {
  id: 't1', type: 'FOLLOW_UP' as const, title: 'Follow up call', status: 'OPEN' as const,
  dueDate: '2026-12-31T00:00:00Z', isOverdue: false,
  assigneeId: 'u1', createdById: 'u1',
  assignee: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  createdBy: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  customer: null, opportunity: null,
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
        <MemoryRouter><TaskListPage /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TaskListPage', () => {
  beforeEach(() => {
    vi.mocked(tasksApi.useTasks).mockReturnValue({
      data: { data: [mockTask], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } },
      isLoading: false,
    } as unknown as ReturnType<typeof tasksApi.useTasks>);
    mockNavigate.mockClear();
  });

  it('renders task table', () => {
    renderPage();
    expect(screen.getByText('Follow up call')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows New Task button for admin', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
  });

  it('hides New Task button for READ_ONLY', () => {
    renderPage(readOnlyCtx);
    expect(screen.queryByRole('button', { name: /new task/i })).not.toBeInTheDocument();
  });

  it('navigates to /tasks/new on button click', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /new task/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/new');
  });

  it('navigates to task detail on row click', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Follow up call'));
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/t1');
  });

  it('shows loading spinner', () => {
    vi.mocked(tasksApi.useTasks).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof tasksApi.useTasks>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows No tasks found when empty', () => {
    vi.mocked(tasksApi.useTasks).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      isLoading: false,
    } as unknown as ReturnType<typeof tasksApi.useTasks>);
    renderPage();
    expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
  });
});
