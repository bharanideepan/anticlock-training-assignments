import { IsEnum, IsUUID } from 'class-validator';
import { ResourceType } from '@prisma/client';

export class FileFilterDto {
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @IsUUID()
  resourceId!: string;
}
