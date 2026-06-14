import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { PageOptionsDto } from '../../common/pagination/page-options.dto';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findAll(@Query() opts: PageOptionsDto) {
    return this.teamsService.findAll(opts);
  }

  @Post()
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }

  @Post(':id/members')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  addMembers(@Param('id') id: string, @Body() dto: AddMembersDto) {
    return this.teamsService.addMembers(id, dto);
  }

  @Delete(':id/members/:userId')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.teamsService.removeMember(id, userId);
  }
}
