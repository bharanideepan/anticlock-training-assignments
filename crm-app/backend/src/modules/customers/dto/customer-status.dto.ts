import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CustomerStatus } from '@prisma/client';

export class CustomerStatusDto {
  @IsEnum(CustomerStatus)
  status!: CustomerStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
