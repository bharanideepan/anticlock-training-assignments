import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Query,
  Res,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ImportService } from './import.service';
import { ExportService } from './export.service';

type ExportEntity = 'customers' | 'contacts';

@Controller('import-export')
export class ImportExportController {
  constructor(
    private readonly importService: ImportService,
    private readonly exportService: ExportService,
  ) {}

  @Post('import/customers')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  @UseInterceptors(FileInterceptor('file'))
  importCustomers(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('CSV file is required');
    return this.importService.importCustomers(file.buffer, req.user.id);
  }

  @Post('import/contacts')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  @UseInterceptors(FileInterceptor('file'))
  importContacts(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('CSV file is required');
    return this.importService.importContacts(file.buffer, req.user.id);
  }

  @Get('export')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
  )
  async exportData(
    @Query('entity') entity: string,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const validEntities: ExportEntity[] = ['customers', 'contacts'];
    if (!validEntities.includes(entity as ExportEntity)) {
      throw new BadRequestException('entity must be customers or contacts');
    }

    let csv: string;
    if (entity === 'customers') {
      csv = await this.exportService.exportCustomers(req.user);
    } else {
      csv = await this.exportService.exportContacts(req.user);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${entity}-export.csv"`,
    );
    res.send(csv);
  }
}
