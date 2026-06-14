import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { TaskStatus, TaskType } from '@prisma/client';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto';

export class TaskFilterDto extends PageOptionsDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  overdue?: boolean;

  @IsOptional()
  @IsISO8601()
  dueDateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dueDateTo?: string;
}
