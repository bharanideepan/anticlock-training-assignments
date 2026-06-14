import { Controller, Get, Query } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';

@Controller('audit')
@Roles(RoleName.SYSTEM_ADMINISTRATOR)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  findAll(@Query() filter: AuditFilterDto) {
    return this.auditService.findAll(filter);
  }
}
