import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  VisibilityGuard,
  RequestWithVisibility,
} from '../../common/guards/visibility.guard';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';
import { PageOptionsDto } from '../../common/pagination/page-options.dto';

@Controller('contacts')
@UseGuards(VisibilityGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(
    @Query() filter: ContactFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.contactsService.findAll(filter, req.visibilityFilter);
  }

  @Post()
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  create(@Body() dto: CreateContactDto, @Request() req: RequestWithVisibility) {
    return this.contactsService.create(dto, req.visibilityFilter);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    return this.contactsService.findOne(id, req.visibilityFilter);
  }

  @Patch(':id')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.contactsService.update(id, dto, req.visibilityFilter);
  }

  @Delete(':id')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    return this.contactsService.remove(id, req.visibilityFilter);
  }

  @Get(':id/activities')
  getActivities(
    @Param('id') id: string,
    @Query() opts: PageOptionsDto & { type?: string },
    @Request() req: RequestWithVisibility,
  ) {
    return this.contactsService.getActivities(id, opts, req.visibilityFilter);
  }
}
