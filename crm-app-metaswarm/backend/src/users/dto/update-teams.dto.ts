import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateTeamsDto {
  @ApiProperty({ type: [String], description: 'Replaces the full team list (empty array removes all teams)' })
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds: string[];
}
