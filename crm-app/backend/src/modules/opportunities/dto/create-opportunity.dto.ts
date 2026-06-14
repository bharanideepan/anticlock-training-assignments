import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  name!: string;

  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedRevenue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsISO8601()
  expectedCloseDate?: string;
}
