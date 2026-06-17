import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResourceType, RoleName } from '@prisma/client';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';

const mockPrisma = {
  file: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  customer: { findFirst: jest.fn() },
  opportunity: { findFirst: jest.fn() },
  activity: { findFirst: jest.fn() },
  auditLog: { create: jest.fn() },
};

const mockS3 = {
  createPresignedUpload: jest.fn(),
  createPresignedDownload: jest.fn(),
  deleteObject: jest.fn(),
  getBucket: jest.fn().mockReturnValue('crm-files'),
};

const ADMIN = RoleName.SYSTEM_ADMINISTRATOR;
const MANAGER = RoleName.SALES_MANAGER;
const REP = RoleName.SALES_REPRESENTATIVE;

const mockFile = {
  id: 'file-1', originalName: 'doc.pdf', mimeType: 'application/pdf',
  sizeBytes: BigInt(1024), s3Key: 'files/file-1/doc.pdf', s3Bucket: 'crm-files',
  resourceType: ResourceType.CUSTOMER, resourceId: 'cust-1',
  uploadedById: 'user-1', createdAt: new Date(), deletedAt: null,
  uploadedBy: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
};

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();
    service = module.get<FilesService>(FilesService);
  });

  describe('requestUploadUrl', () => {
    it('returns presigned upload URL for admin on customer resource', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', ownerId: 'user-1' });
      mockPrisma.file.create.mockResolvedValue(mockFile);
      mockS3.createPresignedUpload.mockResolvedValue({ uploadUrl: 'https://s3.example.com/upload', uploadFields: {} });
      const result = await service.requestUploadUrl(
        { originalName: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: 1024, resourceType: ResourceType.CUSTOMER, resourceId: 'cust-1' },
        'user-1', ADMIN, [],
      );
      expect(result.uploadUrl).toBe('https://s3.example.com/upload');
      expect(result.fileId).toBe('file-1');
    });

    it('throws NotFoundException when resource not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.requestUploadUrl(
          { originalName: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: 1024, resourceType: ResourceType.CUSTOMER, resourceId: 'bad' },
          'user-1', ADMIN, [],
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmUpload', () => {
    it('confirms upload and returns file', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({ ...mockFile, uploadedById: 'user-1' });
      const result = await service.confirmUpload('file-1', 'user-1');
      expect(result.id).toBe('file-1');
    });

    it('throws NotFoundException when file not found', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(null);
      await expect(service.confirmUpload('bad', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when not the uploader', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({ ...mockFile, uploadedById: 'other-user' });
      await expect(service.confirmUpload('file-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listFiles', () => {
    it('returns files for a resource', async () => {
      mockPrisma.file.findMany.mockResolvedValue([mockFile]);
      const result = await service.listFiles(ResourceType.CUSTOMER, 'cust-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getDownloadUrl', () => {
    it('returns presigned download URL for admin', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(mockFile);
      mockS3.createPresignedDownload.mockResolvedValue('https://s3.example.com/download?sig=abc');
      const result = await service.getDownloadUrl('file-1', 'user-1', ADMIN, []);
      expect(result.downloadUrl).toContain('https://s3.example.com/download');
    });

    it('throws NotFoundException when file not found', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(null);
      await expect(service.getDownloadUrl('bad', 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes file for uploader', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(mockFile);
      mockPrisma.file.update.mockResolvedValue({ ...mockFile, deletedAt: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      await service.remove('file-1', 'user-1', REP, []);
      expect(mockPrisma.file.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('throws ForbiddenException when non-uploader REP tries to delete', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({ ...mockFile, uploadedById: 'other-user' });
      await expect(service.remove('file-1', 'user-1', REP, [])).rejects.toThrow(ForbiddenException);
    });

    it('allows manager to delete any file', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({ ...mockFile, uploadedById: 'other-user' });
      mockPrisma.file.update.mockResolvedValue({ ...mockFile, deletedAt: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      await service.remove('file-1', 'mgr-1', MANAGER, []);
      expect(mockPrisma.file.update).toHaveBeenCalled();
    });
  });
});
