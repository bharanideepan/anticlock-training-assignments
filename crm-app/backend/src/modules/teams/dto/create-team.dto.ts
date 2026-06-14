import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;
}
