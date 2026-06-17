import { render, screen } from '@testing-library/react';

vi.mock('@mui/icons-material/Delete', () => ({ default: () => null }));
vi.mock('@mui/icons-material/Download', () => ({ default: () => null }));
vi.mock('@mui/icons-material/UploadFile', () => ({ default: () => null }));
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FileList } from './FileList';
import * as filesApi from '../api/files';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';

vi.mock('../api/files');

const mockFile = {
  id: 'f1', originalName: 'contract.pdf', mimeType: 'application/pdf',
  sizeBytes: 2048576, resourceType: 'CUSTOMER' as const, resourceId: 'cust-1',
  uploadedBy: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  createdAt: '2026-01-15T10:00:00Z',
};

const adminCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const mockUploadMutation = { mutate: vi.fn(), isPending: false, isError: false };
const mockDeleteMutation = { mutate: vi.fn(), isPending: false };

function renderComponent(authCtx = adminCtx) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter>
          <FileList resourceType="CUSTOMER" resourceId="cust-1" />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('FileList', () => {
  beforeEach(() => {
    vi.mocked(filesApi.useFiles).mockReturnValue({
      data: [mockFile], isLoading: false,
    } as unknown as ReturnType<typeof filesApi.useFiles>);
    vi.mocked(filesApi.useUploadFile).mockReturnValue(mockUploadMutation as never);
    vi.mocked(filesApi.useDeleteFile).mockReturnValue(mockDeleteMutation as never);
  });

  it('renders file name', () => {
    renderComponent();
    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
  });

  it('renders formatted file size', () => {
    renderComponent();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
  });

  it('renders uploader name', () => {
    renderComponent();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows Upload File button for admin', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
  });

  it('shows No files attached when empty', () => {
    vi.mocked(filesApi.useFiles).mockReturnValue({
      data: [], isLoading: false,
    } as unknown as ReturnType<typeof filesApi.useFiles>);
    renderComponent();
    expect(screen.getByText('No files attached')).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    vi.mocked(filesApi.useFiles).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof filesApi.useFiles>);
    renderComponent();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
