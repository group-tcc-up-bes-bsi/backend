import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { UsersEntity } from 'src/users/entity/users.entity';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  //let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);
    await db.getRepository(UsersEntity).clear();
    await db.getRepository(UsersEntity).save({
      username: 'john_doe',
      password: '123',
      email: 'test@example.com',
    });

    /*
    authToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'john_doe', password: '123' })
    ).body.token;
    */

    //.set('Authorization', `Bearer ${authToken}`)
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create', () => {
    const testUser = {
      username: 'jane_doe' as any,
      password: '321' as any,
      email: 'jane.doe@gmail.com' as any,
    };

    beforeEach(
      () =>
        (testUser.email = `jane.doe${Math.floor(Math.random() * 1000)}@gmail.com`),
    );

    it('User created successfully', () => {
      const email = testUser.email;
      return request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.username).toBe(testUser.username);
          expect(res.body.password).toBe(testUser.password);
          expect(res.body.email).toBe(testUser.email);
          expect(res.body.userId).toBeDefined();
        })
        .expect((res) => {
          db.getRepository(UsersEntity)
            .findOneBy({ userId: res.body.userId })
            .then((user) => {
              expect(user).toBeDefined();
              expect(user.username).toBe(testUser.username);
              expect(user.password).toBe(testUser.password);
              expect(user.email).toBe(email);
            });
        });
    });

    it('User already exists', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          username: 'john_doe',
          password: '123',
          email: 'test@example.com',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toBe('User already exists');
        });
    });

    it('Invalid username', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser, username: 123 })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['username must be a string']);
        });
    });

    it('Missing username', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser, username: null })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['username must be a string']);
        });
    });

    it('Invalid password', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser, password: 123 })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['password must be a string']);
        });
    });

    it('Missing password', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser, password: null })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['password must be a string']);
        });
    });

    it('Invalid email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser, email: 'jane123' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['email must be an email']);
        });
    });

    it('Missing email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser, email: null })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['email must be an email']);
        });
    });
  });
});
