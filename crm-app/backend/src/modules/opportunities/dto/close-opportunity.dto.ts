import { IsOptional, IsString } from 'class-validator';

export class CloseOpportunityDto {
  @IsOptional()
  @IsString()
  closeNote?: string;
}
