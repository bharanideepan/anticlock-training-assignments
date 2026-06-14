import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateContactDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsUUID()
  customerId!: string;
}
