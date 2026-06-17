import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query (min 2 chars)' })
  @IsString()
  @MinLength(2)
  q: string;

  @ApiPropertyOptional({ description: 'Comma-separated: customer,contact,opportunity,activity,task' })
  @IsOptional()
  @IsString()
  types?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number = 10;
}
