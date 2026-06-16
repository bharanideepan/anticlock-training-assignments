import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ enum: CustomerStatus })
  @IsEnum(CustomerStatus)
  status: CustomerStatus;

  @ApiPropertyOptional({ example: 'Contract signed' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
