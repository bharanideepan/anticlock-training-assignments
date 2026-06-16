import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryOpportunitiesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt() @Min(1) @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseFloat(value))
  @IsNumber()
  minRevenue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseFloat(value))
  @IsNumber()
  maxRevenue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  closeDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  closeDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  includeTerminal?: boolean;

  @ApiPropertyOptional({ enum: ['name', 'expectedRevenue', 'expectedCloseDate', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'expectedRevenue' | 'expectedCloseDate' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
