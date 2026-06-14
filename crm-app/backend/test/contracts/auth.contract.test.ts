import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Auth Contract Tests (POST /api/v1/auth)', () => {
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

  describe('POST /auth/login', () => {
    it('returns 401 for unknown email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'pass' })
        .expect(401);
    });

    it('returns 400 for missing fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 without authorization header', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 401 without refresh cookie', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });
  });
});
