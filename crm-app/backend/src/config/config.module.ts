import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_TTL: Joi.number().default(900),
        JWT_REFRESH_TTL: Joi.number().default(604800),
        S3_ENDPOINT: Joi.string().required(),
        S3_BUCKET: Joi.string().required(),
        S3_REGION: Joi.string().default('us-east-1'),
        S3_ACCESS_KEY: Joi.string().required(),
        S3_SECRET_KEY: Joi.string().required(),
        S3_PRESIGNED_TTL: Joi.number().default(3600),
        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.number().default(1025),
        MAIL_SECURE: Joi.boolean().default(false),
        MAIL_FROM: Joi.string().email({ tlds: { allow: false } }).default('noreply@crm.local'),
        CRYPTO_KEY: Joi.string().length(64).required(),
        LOG_LEVEL: Joi.string().default('info'),
        APP_URL: Joi.string().default('http://localhost:3000'),
        FRONTEND_URL: Joi.string().default('http://localhost:5173'),
      }),
    }),
  ],
})
export class ConfigModule {}
