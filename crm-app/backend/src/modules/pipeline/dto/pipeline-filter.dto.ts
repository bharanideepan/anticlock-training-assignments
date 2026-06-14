import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class PipelineFilterDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsISO8601()
  closeDateFrom?: string;

  @IsOptional()
  @IsISO8601()
  closeDateTo?: string;
}
