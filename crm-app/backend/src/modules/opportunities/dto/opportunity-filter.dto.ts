import {
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto';

export class OpportunityFilterDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRevenue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxRevenue?: number;

  @IsOptional()
  @IsISO8601()
  closeDateFrom?: string;

  @IsOptional()
  @IsISO8601()
  closeDateTo?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeTerminal?: boolean;
}
