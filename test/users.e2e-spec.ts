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
    });
    userId = user.userId;

    authToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'john_doe', password: '123' })
    ).body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create', () => {
    const testUser = {
      username: 'jane_doe' as any,
      password: '321' as any,
    };

    it('User created successfully', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.username).toBe(testUser.username);
          expect(res.body.password).toBe(testUser.password);
          expect(res.body.userId).toBeDefined();
        })
        .expect((res) => {
          db.getRepository(UserEntity)
            .findOneBy({ userId: res.body.userId })
            .then((user) => {
              expect(user).toBeDefined();
              expect(user.username).toBe(testUser.username);
              expect(user.password).toBe(testUser.password);
            });
        });
    });

    it('User already exists', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          username: 'john_doe',
          password: '123',
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
  });

  describe('Read - Get all', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
    });

    it('Get all users successfully', async () => {
      await db.getRepository(UserEntity).save({
        username: 'user1',
        password: 'password1',
      });

      await db.getRepository(UserEntity).save({
        username: 'user2',
        password: 'password2',
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
              }),
              expect.objectContaining({
                username: 'user2',
              }),
            ]),
          );
        });
    });
  });

  describe('Read - Get by Id', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
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
          });
        });
    });

    it('Trying to access another user', () => {
      return request(app.getHttpServer())
        .get('/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('You are not authorized to access this resource');
        });
    });
  });

  describe('Update', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ username: 'updated_user', password: 'newpassword123' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
    });

    it('User updated successfully', () => {
      const updatedUser = {
        username: 'updated_user',
        password: 'newpassword123',
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
        .expect(200)
        .expect((res) => {
          expect(res.body).toStrictEqual({
            userId: userId,
            username: 'john_doe',
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
      return request(app.getHttpServer())
        .delete('/users/999')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
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
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('You are not authorized to access this resource');
        });
    });
  });
});
