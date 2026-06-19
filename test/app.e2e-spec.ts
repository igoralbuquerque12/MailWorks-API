import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterEach(async () => app.close());

  it('/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer() as App).get(
      '/v1/health',
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ status: 'ok', service: 'mailworks-api' }),
    );
  });
});
