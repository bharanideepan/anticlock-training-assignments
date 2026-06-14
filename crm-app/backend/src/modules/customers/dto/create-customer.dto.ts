import { IsEnum, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { RevenueRange } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsEnum(RevenueRange)
  revenueRange?: RevenueRange;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
