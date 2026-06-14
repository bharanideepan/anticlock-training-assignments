import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CustomerStatus } from '@prisma/client';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto';

export class CustomerFilterDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
