import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  VisibilityGuard,
  RequestWithVisibility,
} from '../../common/guards/visibility.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerStatusDto } from './dto/customer-status.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { PageOptionsDto } from '../../common/pagination/page-options.dto';

@Controller('customers')
@UseGuards(VisibilityGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(
    @Query() filter: CustomerFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.customersService.findAll(filter, req.visibilityFilter);
  }

  @Post()
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  create(
    @Body() dto: CreateCustomerDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.customersService.create(dto, req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    return this.customersService.findOne(id, req.visibilityFilter);
  }

  @Patch(':id')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.customersService.update(id, dto, req.visibilityFilter);
  }

  @Post(':id/status')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  transition(
    @Param('id') id: string,
    @Body() dto: CustomerStatusDto,
    @Request() req: RequestWithVisibility,
  ) {
    const isAdmin = req.user.role === RoleName.SYSTEM_ADMINISTRATOR;
    return this.customersService.transition(
      id,
      dto,
      req.visibilityFilter,
      isAdmin,
    );
  }

  @Post(':id/archive')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  archive(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    return this.customersService.archive(id, req.visibilityFilter);
  }

  @Post(':id/unarchive')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  unarchive(@Param('id') id: string) {
    return this.customersService.unarchive(id);
  }

  @Get(':id/contacts')
  getContacts(
    @Param('id') id: string,
    @Query() opts: PageOptionsDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.customersService.getContacts(id, opts, req.visibilityFilter);
  }

  @Get(':id/activities')
  getActivities(
    @Param('id') id: string,
    @Query() opts: PageOptionsDto & { type?: string },
    @Request() req: RequestWithVisibility,
  ) {
    return this.customersService.getActivities(id, opts, req.visibilityFilter);
  }

  @Get(':id/opportunities')
  getOpportunities(
    @Param('id') id: string,
    @Query() opts: PageOptionsDto & { stageId?: string },
    @Request() req: RequestWithVisibility,
  ) {
    return this.customersService.getOpportunities(
      id,
      opts,
      req.visibilityFilter,
    );
  }

  @Get(':id/tasks')
  getCustomerTasks(
    @Param('id') id: string,
    @Query() opts: PageOptionsDto & { status?: string },
    @Request() req: RequestWithVisibility,
  ) {
    return this.customersService.getTasks(id, opts, req.visibilityFilter);
  }

  @Get(':id/files')
  getFiles(@Param('id') id: string, @Request() req: RequestWithVisibility) {
    return this.customersService.getFiles(id, req.visibilityFilter);
  }
}
