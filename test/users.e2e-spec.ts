import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { flushDatabase, flushDatabaseTable, saveTestUser } from './helpers/database-utils';
import { makeTestLogin } from './helpers/endpoint-utils';

//////////////////////////////////////////////////////////////////////
// Test entity objects
///////////////////////////////////////////////////////////////////////

const testUser = {
  username: 'john_doe',
  password: '123',
};

const testUser2 = {
  username: 'jane_doe',
  password: '321',
};

//////////////////////////////////////////////////////////////////////
// Testcases
///////////////////////////////////////////////////////////////////////

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
    await flushDatabase(db);
  });

  beforeEach(async () => {
    await flushDatabaseTable(db, [User]);
    userId = await saveTestUser(db, testUser);
    authToken = await makeTestLogin(app, testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create', () => {
    it('User created successfully', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send(testUser2)
        .expect(201)
        .expect((res) => {
          expect(res.body).toMatchObject({
            userId: expect.any(Number),
            message: 'User created successfully',
          });
        })
        .expect((res) => {
          db.getRepository(User)
            .findOneBy({ userId: res.body.userId })
            .then((user) => {
              expect(user).toMatchObject({
                userId: res.body.userId,
                ...testUser2,
              });
            });
        });
    });

    // FIXME Testcase need check
    it.skip('User already exists', async () => {
      return request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 409,
            message: 'Username already exists',
            error: 'Conflict',
          });
        });
    });

    it('Invalid username', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser2, username: 123 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            error: 'Bad Request',
            message: ['username must be a string'],
            statusCode: 400,
          });
        });
    });

    it('Missing username', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser2, username: null })
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            error: 'Bad Request',
            message: ['username must be a string'],
            statusCode: 400,
          });
        });
    });

    it('Invalid password', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser2, password: 123 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            error: 'Bad Request',
            message: ['password must be a string'],
            statusCode: 400,
          });
        });
    });

    it('Missing password', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...testUser2, password: null })
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            error: 'Bad Request',
            message: ['password must be a string'],
            statusCode: 400,
          });
        });
    });
  });

  describe('Read - Get all', () => {
    it('Get all users not allowed', async () => {
      return request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${authToken}`).expect(404);
    });
  });

  describe('Read - Get by Id', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get(`/users/by-id/${userId}`).expect(401);
    });

    it('Get user by ID successfully', () => {
      return request(app.getHttpServer())
        .get(`/users/by-id/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            ...testUser,
            userId: userId,
            createdAt: expect.any(String),
          });
        });
    });

    it('Trying to access another user', () => {
      return request(app.getHttpServer())
        .get('/users/by-id/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toBe('You are not authorized to access this resource');
        });
    });
  });

  describe('Read - Get by Username', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get(`/users/by-username`).expect(401);
    });

    it('Get user by username successfully', () => {
      return request(app.getHttpServer())
        .get(`/users/by-username?username=${encodeURIComponent('john_doe')}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            userId: userId,
            username: 'john_doe',
          });
        });
    });

    it('Get user by username - not found', () => {
      return request(app.getHttpServer())
        .get(`/users/by-username?username=${encodeURIComponent('nonexistent_user')}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            statusCode: 404,
            message: 'User with this username not found',
            error: 'Not Found',
          });
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
      };

      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedUser)
        .expect(200)
        .expect((res) => {
          expect(res.body).toStrictEqual({
            userId: userId,
            message: 'User successfully updated',
          });
        })
        .expect(() => {
          db.getRepository(User)
            .findOneBy({ userId: userId })
            .then((user) => {
              expect(user).toMatchObject({
                ...updatedUser,
                userId: userId,
                createdAt: expect.any(Date),
              });
            });
        });
    });

    it('User updated successfully - Only 1 param', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'updated_doe' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            userId: userId,
            message: 'User successfully updated',
          });
        })
        .expect(() => {
          db.getRepository(User)
            .findOneBy({ userId: userId })
            .then((user) => {
              expect(user).toMatchObject({
                ...testUser,
                userId: userId,
                username: 'updated_doe',
                createdAt: expect.any(Date),
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

  /*
  describe('Update Password', () => {
    it('User password changed successfully', () => {

    });
  });
  */

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
            message: 'User successfully deleted',
            userId,
          });
        })
        .expect(() => {
          db.getRepository(User)
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

  // TODO testcases for update password (adminPass)
  // TODO review testcases for Get by Username.
});
