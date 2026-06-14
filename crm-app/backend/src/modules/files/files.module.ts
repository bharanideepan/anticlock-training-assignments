import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { createS3Client, S3_CLIENT, S3_BUCKET } from '../../config/s3.config';

@Module({
  imports: [ConfigModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: S3_CLIENT,
      useFactory: (config: ConfigService) => createS3Client(config),
      inject: [ConfigService],
    },
    {
      provide: S3_BUCKET,
      useFactory: (config: ConfigService) =>
        config.get<string>('S3_BUCKET', 'crm-files'),
      inject: [ConfigService],
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
