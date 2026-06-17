import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { ResourceType } from '@prisma/client';

export class UploadUrlDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  originalName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  mimeType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(26_214_400)
  sizeBytes!: number;

  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @ApiProperty()
  @IsString()
  resourceId!: string;
}
