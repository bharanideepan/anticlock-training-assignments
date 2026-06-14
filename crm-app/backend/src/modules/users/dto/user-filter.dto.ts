import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserStatus } from '@prisma/client';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto';

export class UserFilterDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
