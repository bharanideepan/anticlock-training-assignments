import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStageDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  displayOrder?: number;
}
