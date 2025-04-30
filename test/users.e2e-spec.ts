import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { UsersEntity } from 'src/users/entity/users.entity';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let authToken: string;

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

  describe('Read - Get all', () => {
    beforeAll(async () => await db.getRepository(UsersEntity).clear());

    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
    });

    it('Get all users successfully', async () => {
      await db.getRepository(UsersEntity).save({
        username: 'user1',
        password: 'password1',
        email: 'user1@example.com',
      });

      await db.getRepository(UsersEntity).save({
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
    let userId: number;

    beforeAll(async () => {
      await db.getRepository(UsersEntity).clear();
      const user = await db.getRepository(UsersEntity).save({
        username: 'specific_user',
        password: 'specific123',
        email: 'specific_user@example.com',
      });
      userId = user.userId;
    });

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
            username: 'specific_user',
            email: 'specific_user@example.com',
          });
        });
    });

    it('User not found', () => {
      return request(app.getHttpServer())
        .get('/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('User not found');
        });
    });
  });

  describe('Update', () => {
    beforeEach(async () => {
      await db.getRepository(UsersEntity).clear();
      await db.getRepository(UsersEntity).save({
        userId: 888,
        username: 'update_user',
        password: 'update123',
        email: 'update_user@example.com',
      });
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .put('/users/888')
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
        email: 'updated_email@example.com',
      };

      return request(app.getHttpServer())
        .put('/users/888')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedUser)
        .expect(200)
        .expect((res) => {
          expect(res.body).toStrictEqual({
            userId: 888,
            username: 'updated_user',
            email: 'updated_email@example.com',
          });
        })
        .expect(() => {
          db.getRepository(UsersEntity)
            .findOneBy({ userId: 888 })
            .then((user) => {
              expect(user).toMatchObject({
                userId: 888,
                ...updatedUser,
              });
            });
        });
    });

    it('User updated successfully - Only 1 param', () => {
      return request(app.getHttpServer())
        .put('/users/888')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'updated_email@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toStrictEqual({
            userId: 888,
            username: 'update_user',
            email: 'updated_email@example.com',
          });
        })
        .expect(() => {
          db.getRepository(UsersEntity)
            .findOneBy({ userId: 888 })
            .then((user) => {
              expect(user).toMatchObject({
                userId: 888,
                username: 'update_user',
                password: 'update123',
                email: 'updated_email@example.com',
              });
            });
        });
    });

    it('User not found', () => {
      return request(app.getHttpServer())
        .put('/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'nonexistent_user' })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('User not found');
        });
    });

    it('Invalid username', () => {
      return request(app.getHttpServer())
        .put('/users/888')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 123 })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['username must be a string']);
        });
    });

    it('Invalid password', () => {
      return request(app.getHttpServer())
        .put('/users/888')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 1234 })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['password must be a string']);
        });
    });

    it('Invalid email', () => {
      return request(app.getHttpServer())
        .put('/users/888')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'aaa' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toStrictEqual(['email must be an email']);
        });
    });

    it('Request without body', () => {
      return request(app.getHttpServer())
        .put('/users/888')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('No data provided for update');
        });
    });
  });

  describe('Delete', () => {
    beforeEach(async () => {
      await db.getRepository(UsersEntity).clear();
      await db.getRepository(UsersEntity).save({
        userId: 999,
        username: 'delete_user',
        password: 'delete123',
        email: 'delete_user@example.com',
      });
    });

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
        .delete('/users/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toStrictEqual({
            username: 'delete_user',
            password: 'delete123',
            email: 'delete_user@example.com',
          });
        })
        .expect(() => {
          db.getRepository(UsersEntity)
            .findOneBy({ userId: 999 })
            .then((user) => {
              expect(user).toBeNull();
            });
        });
    });

    it('Email not found', () => {
      return request(app.getHttpServer())
        .delete('/users/11111')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Email not found');
        });
    });
  });
});
