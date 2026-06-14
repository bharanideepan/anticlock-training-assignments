import { IsArray, IsUUID } from 'class-validator';

export class AssignTeamsDto {
  @IsArray()
  @IsUUID('all', { each: true })
  teamIds!: string[];
}
