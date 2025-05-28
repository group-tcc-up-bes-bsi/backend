import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

describe('E2E - Users Endpoints', () => {
  let app: INestApplication;
  let db: DataSource;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);
  });

  beforeEach(async () => {
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.getRepository(UserEntity).clear();
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    const user = await db.getRepository(UserEntity).save({
      username: 'john_doe',
      password: '123',
      email: 'test@example.com',
    });
    userId = user.userId;

    authToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: '123' })
    ).body.token;
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

    it('User created successfully', () => {
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
          db.getRepository(UserEntity)
            .findOneBy({ userId: res.body.userId })
            .then((user) => {
              expect(user).toBeDefined();
              expect(user.username).toBe(testUser.username);
              expect(user.password).toBe(testUser.password);
              expect(user.email).toBe(testUser.email);
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

  describe('Read - Get all', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('Get all users successfully', async () => {
      await db.getRepository(UserEntity).save({
        username: 'user1',
        password: 'password1',
        email: 'user1@example.com',
      });

      await db.getRepository(UserEntity).save({
        username: 'user2',
        password: 'password2',
        email: 'user2@example.com',
      });

      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          expect(res.body).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                username: 'user1',
                email: 'user1@example.com',
              }),
              expect.objectContaining({
                username: 'user2',
                email: 'user2@example.com',
              }),
            ]),
          );
        });
    });
  });

  describe('Read - Get by Id', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get(`/users/${userId}`).expect(401);
    });

    it('Get user by ID successfully', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            userId: userId,
            username: 'john_doe',
            email: 'test@example.com',
          });
        });
    });

    it('Trying to access another user', () => {
      return request(app.getHttpServer())
        .get('/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toBe('You are not authorized to access this resource');
        });
    });
  });

  describe('Update', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch(`/users/${userId}`).expect(401);
    });

    it('User updated successfully', () => {
      const updatedUser = {
        username: 'updated_user',
        password: 'newpassword123',
        email: 'updated_email@example.com',
      };

      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedUser)
        .expect(200)
        .expect((res) => {
          expect(res.body).toStrictEqual({
            userId: userId,
            username: 'updated_user',
            email: 'updated_email@example.com',
          });
        })
        .expect(() => {
          db.getRepository(UserEntity)
            .findOneBy({ userId: userId })
            .then((user) => {
              expect(user).toMatchObject({
                userId: userId,
                ...updatedUser,
              });
            });
        });
    });

    it('User updated successfully - Only 1 param', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'updated_email@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toStrictEqual({
            userId: userId,
            username: 'john_doe',
            email: 'updated_email@example.com',
          });
        })
        .expect(() => {
          db.getRepository(UserEntity)
            .findOneBy({ userId: userId })
            .then((user) => {
              expect(user).toMatchObject({
                userId: userId,
                username: 'john_doe',
                password: '123',
                email: 'updated_email@example.com',
              });
            });
        });
    });

    it('Trying to update another user', () => {
      return request(app.getHttpServer())
        .patch('/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'nonexistent_user' })
        .expect((res) => {
          expect(res.body.message).toBe('You are not authorized to access this resource');
        });
    });

    it('Invalid username', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 123 })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['username must be a string']);
        });
    });

    it('Invalid password', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 1234 })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['password must be a string']);
        });
    });

    it('Invalid email', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'aaa' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['email must be an email']);
        });
    });

    it('Request without body', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('No data provided for update');
        });
    });
  });

  describe('Delete', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).delete('/users/999').expect(401);
    });

    it('User deleted successfully', () => {
      return request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            username: 'john_doe',
            password: '123',
            email: 'test@example.com',
          });
        })
        .expect(() => {
          db.getRepository(UserEntity)
            .findOneBy({ userId: userId })
            .then((user) => {
              expect(user).toBeNull();
            });
        });
    });

    it('Trying to delete another user', () => {
      return request(app.getHttpServer())
        .delete('/users/11111')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toBe('You are not authorized to access this resource');
        });
    });
  });
});
