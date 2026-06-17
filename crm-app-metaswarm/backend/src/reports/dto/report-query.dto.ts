import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ReportQueryDto {
  @ApiProperty({ description: 'Start of reporting period (ISO 8601)' })
  @IsISO8601()
  fromDate: string;

  @ApiProperty({ description: 'End of reporting period (ISO 8601)' })
  @IsISO8601()
  toDate: string;

  @ApiPropertyOptional({ description: 'Filter to specific user UUID (within visibility)' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Filter to specific team UUID (Manager/Admin only)' })
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
