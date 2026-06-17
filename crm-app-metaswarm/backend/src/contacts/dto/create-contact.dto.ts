import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'Sarah' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Lee' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'sarah.lee@acme.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0401' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'VP of Sales' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  designation?: string;

  @ApiPropertyOptional({ example: 'Sales' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @ApiPropertyOptional({ example: 'Key decision maker' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Customer UUID' })
  @IsUUID()
  customerId: string;
}
