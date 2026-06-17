import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ description: 'Role UUID to assign' })
  @IsUUID()
  roleId: string;
}
