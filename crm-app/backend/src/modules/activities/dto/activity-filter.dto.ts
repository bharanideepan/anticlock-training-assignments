import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ActivityType } from '@prisma/client';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto';

export class ActivityFilterDto extends PageOptionsDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
