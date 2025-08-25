import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

describe('E2E - Auth Endpoints', () => {
  let app: INestApplication;
  let db: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.getRepository(UserEntity).clear();
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    await db.getRepository(UserEntity).save({
      username: 'john_doe',
      password: '123',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login', () => {
    it('Logged in successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'john_doe', password: '123' })
        .expect(200)
        .expect((res) => {
          expect(res.body.token).toBeDefined();
          expect(res.body.user.userId).toBeDefined();
          expect(res.body.user.username).toBeDefined();
        });
    });

    it('Invalid username', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'random', password: 'invalid' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid username');
        });
    });

    it('Invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'john_doe', password: 'invalid' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid password');
        });
    });

    it('Missing properties', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'john_doe' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('username and password are required');
        });
    });
  });

  describe('Me', () => {
    it('Get user info, user is authenticated', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'john_doe', password: '123' })
        .expect(200);
      const token = loginResponse.body.token;
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBeDefined();
          expect(res.body.username).toBe('john_doe');
        });
    });

    it('Get user info, user is not authenticated', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
    });
  });
});
