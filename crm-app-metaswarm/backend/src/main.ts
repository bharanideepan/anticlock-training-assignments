import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Cookie parser for httpOnly refresh token cookie
  app.use(cookieParser());

  // Global validation pipe — strips unknown fields, validates DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // Global serializer interceptor — respects @Exclude() on response classes
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS
  app.enableCors();

  // Swagger documentation at /api/v1/docs
  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('Enterprise CRM REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
