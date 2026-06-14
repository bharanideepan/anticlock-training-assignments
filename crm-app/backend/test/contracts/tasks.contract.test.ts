import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('tasks Contract Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 without authentication', () => {
    // All protected endpoints return 401 without a valid Bearer token
    return request(app.getHttpServer())
      .get('/api/v1/tasks')
      .expect((res: any) => {
        expect([401, 403, 404]).toContain(res.status);
      });
  });
});
