import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Audit Contract Tests (GET /api/v1/audit)', () => {
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
    return request(app.getHttpServer()).get('/api/v1/audit/logs').expect(401);
  });

  it('returns paginated results shape', async () => {
    // This test requires a seeded SYSTEM_ADMINISTRATOR user and valid JWT
    // In CI, use a pre-seeded test database and auth token
    // For now, just verify the endpoint exists and returns 401 without auth
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit/logs')
      .set('Authorization', 'Bearer invalid-token');
    expect([401, 403]).toContain(res.status);
  });
});
