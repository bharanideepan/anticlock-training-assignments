import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportExportController } from './import-export.controller';
import { ImportService } from './import.service';
import { ExportService } from './export.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [ImportExportController],
  providers: [ImportService, ExportService],
})
export class ImportExportModule {}
