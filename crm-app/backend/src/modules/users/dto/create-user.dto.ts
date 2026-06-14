import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  teamIds?: string[];
}
