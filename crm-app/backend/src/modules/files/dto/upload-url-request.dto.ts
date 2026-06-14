import { IsEnum, IsNumber, IsString, IsUUID, Max, Min } from 'class-validator';
import { ResourceType } from '@prisma/client';

export class UploadUrlRequestDto {
  @IsString()
  originalName!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  @Min(1)
  @Max(26_214_400)
  sizeBytes!: number;

  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @IsUUID()
  resourceId!: string;
}
