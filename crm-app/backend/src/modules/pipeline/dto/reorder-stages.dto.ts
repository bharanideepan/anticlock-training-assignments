import { IsArray, IsUUID } from 'class-validator';

export class ReorderStagesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  stageIds!: string[];
}
