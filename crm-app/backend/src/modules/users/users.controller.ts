import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignTeamsDto } from './dto/assign-teams.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  findAll(@Query() filter: UserFilterDto) {
    return this.usersService.findAll(filter);
  }

  @Post()
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/deactivate')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.usersService.deactivate(id, req.user.sub);
  }

  @Post(':id/reactivate')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  reactivate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }

  @Post(':id/reset-password')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  @HttpCode(HttpStatus.ACCEPTED)
  resetPassword(@Param('id') id: string) {
    return this.usersService.adminResetPassword(id);
  }

  @Patch(':id/role')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto);
  }

  @Patch(':id/teams')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  assignTeams(@Param('id') id: string, @Body() dto: AssignTeamsDto) {
    return this.usersService.assignTeams(id, dto);
  }
}
