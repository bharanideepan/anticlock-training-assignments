import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ReportFilterDto {
  @IsISO8601()
  fromDate!: string;

  @IsISO8601()
  toDate!: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
