import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, ResourceType, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';
import { UploadUrlDto } from './dto/upload-url.dto';

const MAX_SIZE = 26_214_400;

const FILE_INCLUDE = {
  uploadedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async requestUploadUrl(
    dto: UploadUrlDto,
    actorId: string,
    _actorRole: RoleName,
    _actorTeamIds: string[],
  ) {
    void _actorRole; void _actorTeamIds;

    await this.assertResourceExists(dto.resourceType, dto.resourceId);

    const s3Key = `files/${crypto.randomUUID()}/${dto.originalName}`;
    const bucket = this.s3.getBucket();

    const file = await this.prisma.file.create({
      data: {
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        s3Key,
        s3Bucket: bucket,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        uploadedById: actorId,
      },
      include: FILE_INCLUDE,
    });

    const { uploadUrl, uploadFields } = await this.s3.createPresignedUpload(s3Key, dto.mimeType, MAX_SIZE);
    const expiresAt = new Date(Date.now() + 300_000).toISOString();

    return { uploadUrl, uploadFields, fileId: file.id, expiresAt };
  }

  async confirmUpload(fileId: string, actorId: string) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId }, include: FILE_INCLUDE });

    if (!file) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }

    if (file.uploadedById !== actorId) {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Access denied' });
    }

    return file;
  }

  async listFiles(resourceType: ResourceType, resourceId: string) {
    return this.prisma.file.findMany({
      where: { resourceType, resourceId },
      include: FILE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDownloadUrl(id: string, _actorId: string, _actorRole: RoleName, _actorTeamIds: string[]) {
    void _actorId; void _actorRole; void _actorTeamIds;
    const file = await this.prisma.file.findFirst({ where: { id } });

    if (!file) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }

    const downloadUrl = await this.s3.createPresignedDownload(file.s3Key);
    const expiresAt = new Date(Date.now() + 900_000).toISOString();

    return { downloadUrl, expiresAt };
  }

  async remove(id: string, actorId: string, actorRole: RoleName, _actorTeamIds: string[]) {
    void _actorTeamIds;
    const file = await this.prisma.file.findFirst({ where: { id } });

    if (!file) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }

    const isPrivileged = actorRole === RoleName.SYSTEM_ADMINISTRATOR || actorRole === RoleName.SALES_MANAGER;
    if (!isPrivileged && file.uploadedById !== actorId) {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Only the uploader, admin, or manager can delete files' });
    }

    await this.prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_DELETED, resourceType: 'File', resourceId: id },
    });
  }

  private async assertResourceExists(resourceType: ResourceType, resourceId: string) {
    let exists = false;
    if (resourceType === ResourceType.CUSTOMER) {
      exists = !!(await this.prisma.customer.findFirst({ where: { id: resourceId } }));
    } else if (resourceType === ResourceType.OPPORTUNITY) {
      exists = !!(await this.prisma.opportunity.findFirst({ where: { id: resourceId } }));
    } else if (resourceType === ResourceType.ACTIVITY) {
      exists = !!(await this.prisma.activity.findFirst({ where: { id: resourceId } }));
    }

    if (!exists) {
      throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: `${resourceType} not found` });
    }
  }
}
