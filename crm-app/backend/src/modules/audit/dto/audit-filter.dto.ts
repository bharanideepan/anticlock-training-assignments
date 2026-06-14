import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AuditAction } from '@prisma/client';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto';

export class AuditFilterDto extends PageOptionsDto {
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
