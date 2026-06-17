import { Test, TestingModule } from '@nestjs/testing';
import { ResourceType, RoleName } from '@prisma/client';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockFilesService = {
  requestUploadUrl: jest.fn(),
  confirmUpload: jest.fn(),
  listFiles: jest.fn(),
  getDownloadUrl: jest.fn(),
  remove: jest.fn(),
};

const adminActor = { sub: 'user-1', email: 'a@b.com', role: RoleName.SYSTEM_ADMINISTRATOR, teamIds: [] as string[] };

const mockFile = {
  id: 'file-1', originalName: 'doc.pdf', mimeType: 'application/pdf',
  sizeBytes: 1024, s3Key: 'files/file-1/doc.pdf', s3Bucket: 'crm-files',
  resourceType: ResourceType.CUSTOMER, resourceId: 'cust-1',
  uploadedById: 'user-1', createdAt: new Date(),
  uploadedBy: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
};

describe('FilesController', () => {
  let controller: FilesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [{ provide: FilesService, useValue: mockFilesService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<FilesController>(FilesController);
  });

  it('POST /files/upload-url — returns presigned URL', async () => {
    const mockResult = { uploadUrl: 'https://s3.example.com/upload', uploadFields: {}, fileId: 'file-1', expiresAt: '2026-06-12T10:05:00Z' };
    mockFilesService.requestUploadUrl.mockResolvedValue(mockResult);
    const result = await controller.requestUploadUrl(
      { originalName: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: 1024, resourceType: ResourceType.CUSTOMER, resourceId: 'cust-1' },
      adminActor as never,
    );
    expect(result).toEqual({ data: mockResult });
  });

  it('POST /files/confirm — confirms upload', async () => {
    mockFilesService.confirmUpload.mockResolvedValue(mockFile);
    const result = await controller.confirmUpload({ fileId: 'file-1' }, adminActor as never);
    expect(result).toEqual({ data: mockFile });
  });

  it('GET /files — returns file list', async () => {
    mockFilesService.listFiles.mockResolvedValue([mockFile]);
    const result = await controller.listFiles({ resourceType: 'CUSTOMER', resourceId: 'cust-1' });
    expect(result.data).toHaveLength(1);
  });

  it('GET /files/:id/download-url — returns download URL', async () => {
    const mockUrl = { downloadUrl: 'https://s3.example.com/download', expiresAt: '2026-06-12T10:18:00Z' };
    mockFilesService.getDownloadUrl.mockResolvedValue(mockUrl);
    const result = await controller.getDownloadUrl('file-1', adminActor as never);
    expect(result).toEqual({ data: mockUrl });
  });

  it('DELETE /files/:id — soft-deletes file', async () => {
    mockFilesService.remove.mockResolvedValue(undefined);
    await controller.remove('file-1', adminActor as never);
    expect(mockFilesService.remove).toHaveBeenCalledWith('file-1', 'user-1', RoleName.SYSTEM_ADMINISTRATOR, []);
  });
});
