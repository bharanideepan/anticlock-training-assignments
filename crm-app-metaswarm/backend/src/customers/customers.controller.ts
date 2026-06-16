import {
  Body,
  Controller,
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
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
    RoleName.READ_ONLY,
  )
  async findAll(
    @Query() query: QueryCustomersDto,
    @CurrentUser() actor: ActorPayload,
  ) {
    return this.customersService.findAll(query, actor.sub, actor.role, actor.teamIds);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const customer = await this.customersService.create(dto, actor.sub);
    return { data: customer };
  }

  @Get(':id')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
    RoleName.READ_ONLY,
  )
  async findOne(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const customer = await this.customersService.findOne(id, actor.sub, actor.role, actor.teamIds);
    return { data: customer };
  }

  @Patch(':id')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const customer = await this.customersService.update(id, dto, actor.sub, actor.role, actor.teamIds);
    return { data: customer };
  }

  @Patch(':id/status')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const customer = await this.customersService.updateStatus(
      id,
      dto,
      actor.sub,
      actor.role,
      actor.teamIds,
    );
    return { data: customer };
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  async archive(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const customer = await this.customersService.archive(id, actor.sub, actor.role);
    return { data: customer };
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  async unarchive(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const customer = await this.customersService.unarchive(id, actor.sub);
    return { data: customer };
  }
}
