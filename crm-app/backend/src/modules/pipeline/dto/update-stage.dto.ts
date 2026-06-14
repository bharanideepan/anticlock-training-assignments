import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
