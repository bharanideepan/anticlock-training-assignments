import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma/prisma.service';
import { S3_CLIENT, S3_BUCKET } from '../../config/s3.config';
import { UploadUrlRequestDto } from './dto/upload-url-request.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { FileFilterDto } from './dto/file-filter.dto';

const FILE_SELECT = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  s3Key: true,
  resourceType: true,
  resourceId: true,
  confirmed: true,
  createdAt: true,
  uploadedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(S3_CLIENT) private readonly s3: S3Client,
  ) {}

  private get bucket() {
    return this.config.get<string>(S3_BUCKET, 'crm-files');
  }

  async requestUploadUrl(dto: UploadUrlRequestDto, actorId: string) {
    const fileId = crypto.randomUUID();
    const s3Key = `uploads/${dto.resourceType}/${dto.resourceId}/${fileId}/${dto.originalName}`;

    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: dto.mimeType,
    });
    const uploadUrl = await getSignedUrl(this.s3, putCommand, {
      expiresIn: 300,
    });
    const uploadFields = { key: s3Key };

    const expiresAt = new Date(Date.now() + 300_000).toISOString();

    await this.prisma.file.create({
      data: {
        id: fileId,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        s3Key,
        s3Bucket: this.bucket,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        uploadedById: actorId,
      },
    });

    return { uploadUrl, uploadFields, fileId, expiresAt };
  }

  async confirmUpload(dto: ConfirmUploadDto) {
    const file = await this.prisma.file.findUnique({
      where: { id: dto.fileId },
      select: FILE_SELECT,
    });
    if (!file) throw new NotFoundException('FILE_NOT_FOUND');

    await this.prisma.file.update({
      where: { id: dto.fileId },
      data: { confirmed: true },
    });
    return { ...file, confirmed: true };
  }

  async findAll(filter: FileFilterDto) {
    return this.prisma.file.findMany({
      where: {
        resourceType: filter.resourceType,
        resourceId: filter.resourceId,
        confirmed: true,
      },
      select: FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDownloadUrl(id: string, _actorId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      select: { id: true, s3Key: true, uploadedById: true },
    });
    if (!file) throw new NotFoundException('FILE_NOT_FOUND');

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: file.s3Key,
    });
    const downloadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 900,
    });
    const expiresAt = new Date(Date.now() + 900_000).toISOString();
    return { downloadUrl, expiresAt };
  }

  async remove(id: string, actorId: string, isAdmin: boolean) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      select: { id: true, uploadedById: true },
    });
    if (!file) throw new NotFoundException('FILE_NOT_FOUND');
    if (!isAdmin && file.uploadedById !== actorId)
      throw new ForbiddenException('ACCESS_DENIED');

    await this.prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
