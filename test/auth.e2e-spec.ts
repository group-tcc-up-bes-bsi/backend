import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

describe('Auth Controller (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);
    await db.getRepository(UserEntity).delete({});
    await db.getRepository(UserEntity).save({
      username: 'john_doe',
      password: '123',
      email: 'test@example.com',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login', () => {
    it('Logged in successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: '123' })
        .expect(200)
        .expect((res) => {
          expect(res.body.token).toBeDefined();
          expect(res.body.user.userId).toBeDefined();
          expect(res.body.user.email).toBeDefined();
        });
    });

    it('Invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'random', password: 'invalid' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid email');
        });
    });

    it('Invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'invalid' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid password');
        });
    });

    it('Missing properties', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('email and password are required');
        });
    });
  });

  describe('Me', () => {
    it('Get user info, user is authenticated', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: '123' })
        .expect(200);
      const token = loginResponse.body.token;
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBeDefined();
          expect(res.body.email).toBe('test@example.com');
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
