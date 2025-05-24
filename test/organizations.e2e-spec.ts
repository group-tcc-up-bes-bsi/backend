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

describe('E2E - Organizations Endpoints', () => {
  let app: INestApplication;
  let db: DataSource;
  let authToken: string;
  let authToken2: string;
  let userId: number;
  let userId2: number;
  let testOrganizationId: number;

  const testOrganization = {
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
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.getRepository(OrganizationUserEntity).clear();
    await db.getRepository(OrganizationEntity).clear();
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

    const user2 = await db.getRepository(UserEntity).save({
      username: 'new_john',
      password: '1234',
      email: 'newTest@example.com',
    });
    userId2 = user2.userId;

    authToken2 = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'newTest@example.com', password: '1234' })
    ).body.token;
  });

  afterEach(async () => {
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.getRepository(OrganizationUserEntity).clear();
    await db.getRepository(OrganizationEntity).clear();
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create an organization', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).post('/organizations').send(testOrganization).expect(401);
    });

    it('Organization created successfully', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganization)
        .expect(201);
      const { organizationId } = body;

      // Check response body
      expect(body).toMatchObject({
        message: 'Organization created successfully',
        organizationId: expect.any(Number),
      });

      // Check Organization table in the database.
      expect(
        await db.getRepository(OrganizationEntity).findOneBy({ organizationId }),
      ).toMatchObject({
        ...testOrganization,
        organizationId,
      });

      // Check OrganizationUser table in the database.
      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({ user: { userId }, organization: { organizationId } }),
      ).toMatchObject({
        organizationUserId: expect.any(Number),
        userType: UserType.OWNER,
        inviteAccepted: true,
        userId,
        organizationId,
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

  describe('Update an organization', () => {
    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganization)
        .expect(201);
      testOrganizationId = body.organizationId;
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .send(testOrganization)
        .expect(401);
    });

    it('Organization updated successfully', async () => {
      const updatedOrg = {
        organizationName: 'Updated Org',
        organizationDescription: 'Updated Description',
        organizationType: OrganizationType.COLLABORATIVE,
      };

      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedOrg)
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization successfully updated'));

      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId: testOrganizationId }),
      ).toMatchObject({
        ...updatedOrg,
        organizationId: testOrganizationId,
      });
    });

    it('Organization updated successfully - Only 1 param', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationName: 'updated organization' })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization successfully updated'));

      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId: testOrganizationId }),
      ).toMatchObject({
        ...testOrganization,
        organizationName: 'updated organization',
      });
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .patch('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganization)
        .expect(404);
    });

    it('Invalid organization type', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
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

  describe('Delete an organization', () => {
    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganization)
        .expect(201);
      testOrganizationId = body.organizationId;
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer()).delete(`/organizations/1`).expect(401);
    });

    it('Organization deleted successfully', async () => {
      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId: testOrganizationId }),
      ).toBeDefined();
      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({ organization: { organizationId: testOrganizationId } }),
      ).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization successfully removed'));

      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId: testOrganizationId }),
      ).toBeNull();
      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({ organization: { organizationId: testOrganizationId } }),
      ).toBeNull();
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .delete('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Add user to an organization', () => {
    let newOrgUser: object;

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testOrganization,
          organizationType: OrganizationType.COLLABORATIVE,
        })
        .expect(201);
      testOrganizationId = body.organizationId;

      newOrgUser = {
        userId: userId2,
        organizationId: testOrganizationId,
        userType: UserType.OWNER,
      };
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer()).post('/organizations/addUser').expect(401);
    });

    it('User added successfully - OWNER', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrgUser)
        .expect(201)
        .expect(({ text }) => expect(text).toBe('User successfully added to organization'));

      expect(
        await db.getRepository(OrganizationUserEntity).find({
          where: {
            organization: { organizationId: testOrganizationId },
          },
        }),
      ).toMatchObject([
        {
          organizationUserId: expect.any(Number),
          userId: userId,
          organizationId: testOrganizationId,
          userType: UserType.OWNER,
          inviteAccepted: true,
        },
        {
          ...newOrgUser,
          organizationUserId: expect.any(Number),
          inviteAccepted: false,
        },
      ]);
    });

    it('User added successfully - WRITE', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(201)
        .expect(({ text }) => expect(text).toBe('User successfully added to organization'));

      expect(
        await db.getRepository(OrganizationUserEntity).find({
          where: {
            organization: { organizationId: testOrganizationId },
          },
        }),
      ).toMatchObject([
        {
          organizationUserId: expect.any(Number),
          userId: userId,
          organizationId: testOrganizationId,
          userType: UserType.OWNER,
          inviteAccepted: true,
        },
        {
          ...newOrgUser,
          organizationUserId: expect.any(Number),
          userType: UserType.WRITE,
          inviteAccepted: false,
        },
      ]);
    });

    it('User added successfully - READ', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.READ,
        })
        .expect(201)
        .expect(({ text }) => expect(text).toBe('User successfully added to organization'));

      expect(
        await db.getRepository(OrganizationUserEntity).find({
          where: {
            organization: { organizationId: testOrganizationId },
          },
        }),
      ).toMatchObject([
        {
          organizationUserId: expect.any(Number),
          userId: userId,
          organizationId: testOrganizationId,
          userType: UserType.OWNER,
          inviteAccepted: true,
        },
        {
          ...newOrgUser,
          organizationUserId: expect.any(Number),
          userType: UserType.READ,
          inviteAccepted: false,
        },
      ]);
    });

    it('User not added - Organization not found', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          organizationId: 9999,
        })
        .expect(403)
        .expect(({ body }) =>
          expect(body.message).toBe('The request user is not part of this organization'),
        );
    });

    it('User not added - User not found', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userId: 9999,
        })
        .expect(404)
        .expect(({ body }) => expect(body.message).toBe('User not found'));
    });

    it('User not added - Organization is Individual', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganization)
        .expect(201);
      const indivOrgId = body.organizationId;

      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          organizationId: indivOrgId,
        })
        .expect(400)
        .expect(({ body }) => expect(body.message).toBe('This organization is individual'));
    });

    it('User not added - The request user is not in the organization', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newOrgUser)
        .expect(403)
        .expect(({ body }) =>
          expect(body.message).toBe('The request user is not part of this organization'),
        );
    });

    it('User not added - The request user is not the owner', async () => {
      // User added to the organization, with write perms
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(201)
        .expect(({ text }) => expect(text).toBe('User successfully added to organization'));

      // Send the request as the write user
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newOrgUser)
        .expect(401)
        .expect(({ body }) => expect(body.message).toBe('You do not have permission to do this'));
    });

    it('Missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/organizations/addUser')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            message: [
              'organizationId must be a number conforming to the specified constraints',
              'userId must be a number conforming to the specified constraints',
              'userType must be one of the following values: owner, write, read',
            ],
          });
        });
    });
  });

  describe('Update user permissions', () => {
    let newOrgUser: object;

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testOrganization,
          organizationType: OrganizationType.COLLABORATIVE,
        })
        .expect(201);
      testOrganizationId = body.organizationId;

      newOrgUser = {
        userId: userId2,
        organizationId: testOrganizationId,
        userType: UserType.OWNER,
      };
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch(`/organizations/updateUser/permission`).expect(401);
    });

    it('User permission changed from READ to WRITE', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.READ,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.WRITE,
        })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization user successfully updated'));

      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({
            organizationId: testOrganizationId,
            userId: userId2,
          })
          .then((res) => res.userType),
      ).toBe(UserType.WRITE);
    });

    it('User permission changed from READ to OWNER', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.READ,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.OWNER,
        })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization user successfully updated'));

      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({
            organizationId: testOrganizationId,
            userId: userId2,
          })
          .then((res) => res.userType),
      ).toBe(UserType.OWNER);
    });

    it('User permission changed from WRITE to READ', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.READ,
        })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization user successfully updated'));

      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({
            organizationId: testOrganizationId,
            userId: userId2,
          })
          .then((res) => res.userType),
      ).toBe(UserType.READ);
    });

    it('User permission changed from WRITE to OWNER', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.OWNER,
        })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization user successfully updated'));

      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({
            organizationId: testOrganizationId,
            userId: userId2,
          })
          .then((res) => res.userType),
      ).toBe(UserType.OWNER);
    });

    it('User permission changed from OWNER to READ', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.OWNER,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.READ,
        })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization user successfully updated'));

      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({
            organizationId: testOrganizationId,
            userId: userId2,
          })
          .then((res) => res.userType),
      ).toBe(UserType.READ);
    });

    it('User permission changed from OWNER to WRITE', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.OWNER,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.WRITE,
        })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization user successfully updated'));

      expect(
        await db
          .getRepository(OrganizationUserEntity)
          .findOneBy({
            organizationId: testOrganizationId,
            userId: userId2,
          })
          .then((res) => res.userType),
      ).toBe(UserType.WRITE);
    });

    it('User permission not changed - Organization not found', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: 99999,
          userId: userId2,
          userType: UserType.READ,
        })
        .expect(403)
        .expect(({ body }) =>
          expect(body.message).toBe('The request user is not part of this organization'),
        );
    });

    it('User permission not changed - User not found', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: 99999,
          userType: UserType.READ,
        })
        .expect(404)
        .expect(({ body }) => expect(body.message).toBe('User not found in the organization'));
    });

    it('User permission not changed - Invalid user type', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: 'invalidType',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'userType must be one of the following values: owner, write, read',
          );
        });
    });

    it('User permission not changed - User type is empty', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('New user permission must be provided');
        });
    });

    it('User permission not changed - Invite status sent', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.OWNER,
          inviteAccepted: true,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('You do not have permission to change inviteAccepted');
        });
    });

    it('User permission not changed - Body is empty', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toMatchObject([
            'organizationId must be a number conforming to the specified constraints',
            'userId must be a number conforming to the specified constraints',
          ]);
        });
    });

    it('User not added - The request user is not in the organization', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(403)
        .expect(({ body }) =>
          expect(body.message).toBe('The request user is not part of this organization'),
        );
    });

    it('User not added - The request user is not the owner', async () => {
      // User added to the organization, with write perms
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(201)
        .expect(({ text }) => expect(text).toBe('User successfully added to organization'));

      // Send the request as the write user
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(401)
        .expect(({ body }) => expect(body.message).toBe('You do not have permission to do this'));
    });
  });

  describe('Update user invite status', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch(`/organizations/updateUser/invite`).expect(401);
    });
  });

  /*
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
      return request(app.getHttpServer()).get(`/organizations/${organizationId}/users`).expect(401);
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

  describe('Add user to an organization', () => {
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

  describe('Update user permissions', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch(`/organizations/updateUser/permission`).expect(401);
    });
  });

  describe('Update user invite status', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch(`/organizations/updateUser/invite`).expect(401);
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
        .expect(({ text }) => expect(text).toBe('Organization user successfully updated'));

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
          expect(res.body.message).toContain('inviteAccepted must be a boolean value');
        });
    });
  });

  describe('Remove user from an organization', () => {
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
        .delete(`/organizations/removeUser/${organizationId}/${userToDelete.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ text }) => {
          expect(text).toBe('User successfully removed from organization');
        });

      const deletedUser = await db.getRepository(OrganizationUserEntity).findOne({
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
        .delete(`/organizations/removeUser/${organizationId}/${userOutSider.userId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toMatch(/not a member|permission/gi);
        });
    });
  });*/
});
