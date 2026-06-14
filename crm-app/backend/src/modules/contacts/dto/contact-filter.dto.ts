import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto';

export class ContactFilterDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}
