import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export function createS3Client(config: ConfigService): S3Client {
  return new S3Client({
    region: config.get<string>('S3_REGION', 'us-east-1'),
    endpoint: config.get<string>('S3_ENDPOINT'),
    credentials: {
      accessKeyId: config.get<string>('S3_ACCESS_KEY', ''),
      secretAccessKey: config.get<string>('S3_SECRET_KEY', ''),
    },
    forcePathStyle: true,
  });
}

export const S3_CLIENT = 'S3_CLIENT';
export const S3_BUCKET = 'S3_BUCKET';
