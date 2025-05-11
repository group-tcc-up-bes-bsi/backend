import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  OrganizationEntity,
  OrganizationType,
} from 'src/organizations/entities/organization.entity';
import {
  OrganizationUserEntity,
  UserType,
} from 'src/organizations/entities/organization-user.entity';

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let authToken: string;
  let userIdAux: number;

  const organization = {
    organizationName: 'Test Org',
    organizationDescription: 'Test Description',
    organizationType: OrganizationType.INDIVIDUAL,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);

    await db.getRepository(OrganizationUserEntity).delete({});
    await db.getRepository(OrganizationEntity).delete({});
    await db.getRepository(UserEntity).delete({});

    const user = await db.getRepository(UserEntity).save({
      username: 'john_doe',
      password: '123',
      email: 'test@example.com',
    });

    userIdAux = user.userId;

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
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .post('/organizations')
        .send(organization)
        .expect(401);
    });

    it('Organization created successfully', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organization)
        .expect(201);

      expect(body).toMatchObject({
        message: 'Organization successfully created',
        organizationId: expect.any(Number),
      });

      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId: body.organizationId }),
      ).toMatchObject({
        ...organization,
        organizationId: body.organizationId,
        organizationName: expect.any(String),
        organizationDescription: expect.any(String),
        organizationType: OrganizationType.INDIVIDUAL,
      });
    });
    it('Missing fields', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(body).toMatchObject({
        message: [
          'organizationName must be a string',
          'organizationDescription must be a string',
          'organizationType must be one of the following values: Individual, Collaborative',
        ],
      });
    });
  });

  describe('Read - Get all', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/organizations').expect(401);
    });

    it('Get all organizations', async () => {
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(organization)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          body.forEach((organization) => {
            expect(organization).toMatchObject({
              ...organization,
              organizationId: expect.any(Number),
              organizationName: expect.any(String),
              organizationDescription: expect.any(String),
              organizationType: OrganizationType.INDIVIDUAL,
            });
          });
          expect(body).toHaveLength(3);
        });
    });
  });

  describe('Read - Get one', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/organizations/1').expect(401);
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .get('/organizations/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('Get organization by ID', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organization)
        .expect(201);

      const organizationId = body.organizationId;

      await request(app.getHttpServer())
        .get(`/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            ...organization,
            organizationId,
            organizationName: expect.any(String),
            organizationDescription: expect.any(String),
            organizationType: OrganizationType.INDIVIDUAL,
          });
        });
    });
  });

  describe('Update', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/1`)
        .send(organization)
        .expect(401);
    });

    it('Organization updated successfully', async () => {
      const organizationId = (
        await request(app.getHttpServer())
          .post(`/organizations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(organization)
          .expect(201)
      ).body.organizationId;

      const newOrganization = {
        organizationName: 'My organization',
        organizationDescription: 'Test Description',
        organizationType: OrganizationType.INDIVIDUAL,
      };

      await request(app.getHttpServer())
        .patch(`/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrganization)
        .expect(200)
        .expect(({ text }) =>
          expect(text).toBe('Organization successfully updated'),
        );
      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId }),
      ).toMatchObject({
        ...newOrganization,
        organizationId,
        organizationName: expect.any(String),
        organizationDescription: expect.any(String),
      });
    });

    it('Organization updated successfully - Only 1 param', async () => {
      const organizationId = (
        await request(app.getHttpServer())
          .post(`/organizations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(organization)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .patch(`/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationName: 'updated organization' })
        .expect(200)
        .expect(({ text }) =>
          expect(text).toBe('Organization successfully updated'),
        );

      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId }),
      ).toMatchObject({
        ...organization,
        organizationName: 'updated organization',
        organizationId,
        organizationDescription: expect.any(String),
        organizationType: OrganizationType.INDIVIDUAL,
      });
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .patch('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organization)
        .expect(404);
    });

    it('Invalid organization type', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/1`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationType: 'InvalidType' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'organizationType must be one of the following values: Individual, Collaborative',
          );
        });
    });
  });

  describe('Delete', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/organizations/1`)
        .set(organization)
        .expect(401);
    });

    it('Organization deleted successfully', async () => {
      const organizationId = (
        await request(app.getHttpServer())
          .post(`/organizations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(organization)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .delete(`/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationName: 'updated organization' })
        .expect(200)
        .expect(({ text }) =>
          expect(text).toBe('Organization successfully removed'),
        );
      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId }),
      ).toBeNull();
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .delete('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  /*Organization Users*/

  describe('Read - Get all organization users', () => {
    let organizationId: number;
    const testUsers = [
      { userType: UserType.READ, inviteAccepted: true },
      { userType: UserType.VIEWER, inviteAccepted: false },
    ];

    beforeAll(async () => {
      const org = await db.getRepository(OrganizationEntity).save({
        organizationName: 'Test Org',
        organizationDescription: 'Test Description',
        organizationType: OrganizationType.INDIVIDUAL,
      });
      organizationId = org.organizationId;

      for (const user of testUsers) {
        await db.getRepository(OrganizationUserEntity).save({
          ...user,
          user: { userId: 1 },
          organization: { organizationId },
        });
      }
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .get(`/organizations/${organizationId}/users`)
        .expect(401);
    });

    it('Get all organization users', async () => {
      await request(app.getHttpServer())
        .get(`/organizations/${organizationId}/users`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          body.forEach((orgUser, index) => {
            expect(orgUser).toMatchObject({
              userType: testUsers[index].userType,
              inviteAccepted: testUsers[index].inviteAccepted,
              user: expect.any(Number),
              organization: organizationId,
              organizationUserId: expect.any(Number),
            });
          });
          expect(body).toHaveLength(testUsers.length);
        });
    });

    it('No users found for organization', async () => {
      const emptyOrg = await db.getRepository(OrganizationEntity).save({
        organizationName: 'Empty Org',
        organizationDescription: 'No users',
        organizationType: OrganizationType.INDIVIDUAL,
      });

      await request(app.getHttpServer())
        .get(`/organizations/${emptyOrg.organizationId}/users`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body.message).toBe('No users found for this organization');
        });
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .get('/organizations/99999/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Create Organization User', () => {
    it('Request without authentication', () => {
      const orgUserData = {
        userId: 1,
        organizationId: 1,
        userType: UserType.OWNER,
        inviteAccepted: true,
      };
      return request(app.getHttpServer())
        .post('/organizations/addUser')
        .send(orgUserData)
        .expect(401);
    });

    it('Organization user created successfully', async () => {
      const newUser = await db.getRepository(UserEntity).save({
        username: 'new_john',
        password: '1234',
        email: 'newTest@example.com',
      });

      await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organization)
        .expect(201);

      const orgUserData = {
        userId: newUser.userId,
        organizationId: 1,
        userType: UserType.OWNER,
        inviteAccepted: false,
      };

      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(orgUserData)
        .expect(201);

      expect(
        await db.getRepository(OrganizationUserEntity).findOne({
          where: {
            organization: { organizationId: 1 },
          },
          relations: ['organization', 'user'],
        }),
      ).toMatchObject({
        userType: orgUserData.userType,
        inviteAccepted: orgUserData.inviteAccepted,
        organization: { organizationId: 1 },
        user: { userId: expect.any(Number) },
      });
    });

    it('Missing required fields', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations/addUser')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(body).toMatchObject({
        message: [
          'organizationId must be a number conforming to the specified constraints',
          'userId must be a number conforming to the specified constraints',
          'userType must be one of the following values: owner, read, viewer',
        ],
      });
    });
  });

  describe('Update Organization User', () => {
    let organizationId: number;
    let organizationUserId: number;
    const testUserData = {
      userType: UserType.READ,
      inviteAccepted: true,
    };

    beforeAll(async () => {
      const org = await db.getRepository(OrganizationEntity).save({
        organizationName: 'Test Org',
        organizationDescription: 'Test Description',
        organizationType: OrganizationType.INDIVIDUAL,
      });
      organizationId = org.organizationId;

      const orgUser = await db.getRepository(OrganizationUserEntity).save({
        userType: UserType.READ,
        inviteAccepted: false,
        user: { userId: 1 },
        organization: { organizationId },
      });
      organizationUserId = orgUser.organizationUserId;
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${organizationId}/users/${organizationUserId}`)
        .send(testUserData)
        .expect(401);
    });

    it('Organization user updated successfully', async () => {
      const updateData = {
        userType: UserType.VIEWER,
        inviteAccepted: true,
      };

      await request(app.getHttpServer())
        .patch(`/organizations/${organizationId}/users/${organizationUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect(({ text }) =>
          expect(text).toBe('Organization user successfully updated'),
        );

      const updated = await db.getRepository(OrganizationUserEntity).findOneBy({
        organizationUserId,
      });
      expect(updated).toMatchObject(updateData);
    });

    it('Organization user not found', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${organizationId}/users/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testUserData)
        .expect(404);
    });

    it('Invalid user type', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${organizationId}/users/${organizationUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userType: 'invalidType' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'userType must be one of the following values: owner, read, viewer',
          );
        });
    });

    it('Invalid inviteAccepted type', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${organizationId}/users/${organizationUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ inviteAccepted: 'not-a-boolean' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'inviteAccepted must be a boolean value',
          );
        });
    });
  });

  describe('Delete Organization User', () => {
    let organizationId: number;

    beforeAll(async () => {
      const org = await db.getRepository(OrganizationEntity).save({
        organizationName: 'Test Org',
        organizationDescription: 'Test Description',
        organizationType: OrganizationType.INDIVIDUAL,
      });
      organizationId = org.organizationId;

      await db.getRepository(OrganizationUserEntity).save({
        user: { userId: userIdAux },
        organization: { organizationId },
        userType: UserType.OWNER,
        inviteAccepted: true,
      });
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/organizations/removeUser/${organizationId}/${userIdAux}`)
        .expect(401);
    });

    it('Organization user deleted successfully', async () => {
      const userToDelete = await db.getRepository(UserEntity).save({
        username: 'user_to_delete',
        email: 'delete@test.com',
        password: '123',
      });

      await db.getRepository(OrganizationUserEntity).save({
        user: { userId: userToDelete.userId },
        organization: { organizationId },
        userType: UserType.READ,
        inviteAccepted: true,
      });

      await request(app.getHttpServer())
        .delete(
          `/organizations/removeUser/${organizationId}/${userToDelete.userId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ text }) => {
          expect(text).toBe('User successfully removed from organization');
        });

      const deletedUser = await db
        .getRepository(OrganizationUserEntity)
        .findOne({
          where: {
            user: { userId: userToDelete.userId },
            organization: { organizationId },
          },
        });
      expect(deletedUser).toBeNull();
    });

    it('Organization user not found', () => {
      return request(app.getHttpServer())
        .delete(`/organizations/removeUser/${organizationId}/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('Cannot delete with invalid organization ID', () => {
      return request(app.getHttpServer())
        .delete(`/organizations/removeUser/99999/${userIdAux}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });

    it('User not in organization cannot remove others', async () => {
      const userOutSider = await db.getRepository(UserEntity).save({
        username: 'outsider',
        email: 'outsider@test.com',
        password: '123456',
      });
      const outsiderToken = (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'outsider@test.com', password: '123456' })
      ).body.token;
      request(app.getHttpServer())
        .delete(
          `/organizations/removeUser/${organizationId}/${userOutSider.userId}`,
        )
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toMatch(/not a member|permission/gi);
        });
    });
  });
});
