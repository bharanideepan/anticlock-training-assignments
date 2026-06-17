import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';

interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

const ALL_ROLES = [
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
  RoleName.SUPPORT_REPRESENTATIVE,
  RoleName.READ_ONLY,
];

const WRITE_ROLES = [
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
  RoleName.SUPPORT_REPRESENTATIVE,
];

@ApiTags('contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  async findAll(@Query() query: QueryContactsDto, @CurrentUser() actor: ActorPayload) {
    return this.contactsService.findAll(query, actor.sub, actor.role, actor.teamIds);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(...WRITE_ROLES)
  async create(
    @Body() dto: CreateContactDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const contact = await this.contactsService.create(dto, actor.sub, actor.role, actor.teamIds);
    return { data: contact };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const contact = await this.contactsService.findOne(id, actor.sub, actor.role, actor.teamIds);
    return { data: contact };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const contact = await this.contactsService.update(id, dto, actor.sub, actor.role, actor.teamIds);
    return { data: contact };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  async remove(@Param('id') id: string, @CurrentUser() actor: ActorPayload): Promise<void> {
    await this.contactsService.remove(id, actor.sub, actor.role, actor.teamIds);
  }
}
