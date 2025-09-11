import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { Organization, OrganizationType } from 'src/organizations/entities/organization.entity';
import { OrganizationUser, UserType } from 'src/organizations/entities/organization-user.entity';
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
  username: 'new_john',
  password: '1234',
};

const testUser3 = {
  username: 'jane_doe',
  password: '123',
};

const testOrganizationIndiv = {
  name: 'Test Org',
  description: 'Test Description',
  organizationType: OrganizationType.INDIVIDUAL,
};

const testOrganizationColab = {
  name: 'Test Org',
  description: 'Test Description',
  organizationType: OrganizationType.COLLABORATIVE,
};

//////////////////////////////////////////////////////////////////////
// Testcases
///////////////////////////////////////////////////////////////////////

describe('E2E - Organizations Endpoints', () => {
  let app: INestApplication;
  let db: DataSource;
  let authToken: string;
  let authToken2: string;
  let authToken3: string;
  let userId: number;
  let userId2: number;
  let userId3: number;
  let testOrganizationId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);
    await flushDatabase(db);

    userId = await saveTestUser(db, testUser);
    authToken = await makeTestLogin(app, testUser);

    userId2 = await saveTestUser(db, testUser2);
    authToken2 = await makeTestLogin(app, testUser2);

    userId3 = await saveTestUser(db, testUser3);
    authToken3 = await makeTestLogin(app, testUser3);
  });

  afterEach(async () => {
    testOrganizationId = null;
    await flushDatabaseTable(db, [OrganizationUser, Organization]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create an organization', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).post('/organizations').send(testOrganizationIndiv).expect(401);
    });

    it('Organization created successfully', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationIndiv)
        .expect(201);

      const { organizationId } = body;

      // Check response body
      expect(body).toMatchObject({
        message: 'Organization created successfully',
        organizationId: expect.any(Number),
      });

      // Check Organization table in the database.
      expect(await db.getRepository(Organization).findOneBy({ organizationId })).toMatchObject({
        ...testOrganizationIndiv,
        organizationId,
      });

      // Check OrganizationUser table in the database.
      expect(await db.getRepository(OrganizationUser).findOneBy({ userId, organizationId })).toMatchObject({
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
          'name must be a string',
          'description must be a string',
          'organizationType must be one of the following values: individual, collaborative',
        ],
      });
    });
  });

  describe('Update an organization', () => {
    it('Request without authentication', async () => {
      testOrganizationId = (
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testOrganizationIndiv)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .send(testOrganizationIndiv)
        .expect(401);
    });

    it('Organization updated successfully', async () => {
      testOrganizationId = (
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testOrganizationIndiv)
          .expect(201)
      ).body.organizationId;

      const updatedOrg = {
        name: 'Updated Org',
        description: 'Updated Description',
        organizationType: OrganizationType.COLLABORATIVE,
      };

      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedOrg)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Organization successfully updated',
            organizationId: testOrganizationId,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toMatchObject({
        ...updatedOrg,
        organizationId: testOrganizationId,
      });
    });

    it('Organization updated successfully - Only 1 param', async () => {
      testOrganizationId = (
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testOrganizationIndiv)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'updated organization' })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Organization successfully updated',
            organizationId: testOrganizationId,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toMatchObject({
        ...testOrganizationIndiv,
        name: 'updated organization',
      });
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .patch('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationIndiv)
        .expect(404);
    });

    it('Organization not updated - Invalid organization type', async () => {
      testOrganizationId = (
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testOrganizationIndiv)
          .expect(201)
      ).body.organizationId;

      return request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationType: 'InvalidType' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            error: 'Bad Request',
            message: ['organizationType must be one of the following values: individual, collaborative'],
            statusCode: 400,
          });
        });
    });

    it('Organization not updated - Cannot change from Collaborative to Individual', async () => {
      testOrganizationId = (
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testOrganizationColab)
          .expect(201)
      ).body.organizationId;

      return request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationType: OrganizationType.INDIVIDUAL })
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            error: 'Bad Request',
            message: 'Cannot change organization type from Collaborative to Individual',
            statusCode: 400,
          });
        });
    });

    it('Organization not updated - user has write permissions', async () => {
      testOrganizationId = (
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testOrganizationColab)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId2,
          organizationId: testOrganizationId,
          userType: UserType.WRITE,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: 'updated organization' })
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toMatchObject({
        ...testOrganizationColab,
        organizationId: testOrganizationId,
      });
    });

    it('Organization not updated - user has read permissions', async () => {
      testOrganizationId = (
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testOrganizationColab)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId2,
          organizationId: testOrganizationId,
          userType: UserType.READ,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: 'updated organization' })
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toMatchObject({
        ...testOrganizationColab,
        organizationId: testOrganizationId,
      });
    });

    it('Organization not updated - user is not part of the organization', async () => {
      testOrganizationId = (
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testOrganizationColab)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: 'updated organization' })
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'The request user is not part of this organization',
            statusCode: 403,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toMatchObject({
        ...testOrganizationColab,
        organizationId: testOrganizationId,
      });
    });

    //write e colab -> indiv
  });

  describe('Delete an organization', () => {
    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationColab)
        .expect(201);
      testOrganizationId = body.organizationId;
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer()).delete(`/organizations/1`).expect(401);
    });

    it('Organization deleted successfully', async () => {
      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toBeDefined();
      expect(
        await db.getRepository(OrganizationUser).findOneBy({ organization: { organizationId: testOrganizationId } }),
      ).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Organization successfully removed',
            organizationId: testOrganizationId,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toBeNull();
      expect(
        await db.getRepository(OrganizationUser).findOneBy({ organization: { organizationId: testOrganizationId } }),
      ).toBeNull();
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .delete('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Not Found',
            message: 'Organization not found',
            statusCode: 404,
          }),
        );
    });

    it('Organization not deleted - user has write permissions', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId2,
          organizationId: testOrganizationId,
          userType: UserType.WRITE,
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toBeDefined();
    });

    it('Organization not deleted - user has read permissions', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId2,
          organizationId: testOrganizationId,
          userType: UserType.READ,
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toBeDefined();
    });

    it('Organization not deleted - user is not part of the organization', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'The request user is not part of this organization',
            statusCode: 403,
          }),
        );

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toBeDefined();
    });
  });

  describe('Add user to an organization', () => {
    let newOrgUser: object;

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationColab)
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
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully added to the organization',
            organizationUserId: expect.any(Number),
          }),
        );

      expect(
        await db.getRepository(OrganizationUser).find({
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
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully added to the organization',
            organizationUserId: expect.any(Number),
          }),
        );

      expect(
        await db.getRepository(OrganizationUser).find({
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
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully added to the organization',
            organizationUserId: expect.any(Number),
          }),
        );

      expect(
        await db.getRepository(OrganizationUser).find({
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
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'The request user is not part of this organization',
            statusCode: 403,
          }),
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
        .expect(({ body }) =>
          expect(body).toMatchObject({ error: 'Not Found', message: 'User not found', statusCode: 404 }),
        );
    });

    it('User not added - Organization is Individual', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationIndiv)
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
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: 'This organization is individual',
            statusCode: 400,
          }),
        );
    });

    it('User not added - The request user is not in the organization', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newOrgUser)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'The request user is not part of this organization',
            statusCode: 403,
          }),
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
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully added to the organization',
            organizationUserId: expect.any(Number),
          }),
        );

      // Send the request as the write user
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newOrgUser)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );
    });

    it('Missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/organizations/addUser')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: [
              'organizationId must be a number conforming to the specified constraints',
              'userId must be a number conforming to the specified constraints',
              'userType must be one of the following values: owner, write, read',
            ],
            statusCode: 400,
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
        .send(testOrganizationColab)
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
      const resp = await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.READ,
        })
        .expect(201);

      const newOrganizationUserId = resp.body.organizationUserId;

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.WRITE,
        })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully updated in the organization',
            organizationUserId: newOrganizationUserId,
          }),
        );

      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .then((res) => expect(res.userType).toBe(UserType.WRITE));
    });

    it('User permission changed from READ to OWNER', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.READ,
        })
        .expect(201);

      const newOrganizationUserId = resp.body.organizationUserId;

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.OWNER,
        })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully updated in the organization',
            organizationUserId: newOrganizationUserId,
          }),
        );

      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .then((res) => expect(res.userType).toBe(UserType.OWNER));
    });

    it('User permission changed from WRITE to READ', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(201);

      const newOrganizationUserId = resp.body.organizationUserId;

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.READ,
        })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully updated in the organization',
            organizationUserId: newOrganizationUserId,
          }),
        );

      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .then((res) => expect(res.userType).toBe(UserType.READ));
    });

    it('User permission changed from WRITE to OWNER', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(201);

      const newOrganizationUserId = resp.body.organizationUserId;

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.OWNER,
        })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully updated in the organization',
            organizationUserId: newOrganizationUserId,
          }),
        );

      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .then((res) => expect(res.userType).toBe(UserType.OWNER));
    });

    it('User permission changed from OWNER to READ', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.OWNER,
        })
        .expect(201);

      const newOrganizationUserId = resp.body.organizationUserId;

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.READ,
        })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully updated in the organization',
            organizationUserId: newOrganizationUserId,
          }),
        );

      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .then((res) => expect(res.userType).toBe(UserType.READ));
    });

    it('User permission changed from OWNER to WRITE', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.OWNER,
        })
        .expect(201);

      const newOrganizationUserId = resp.body.organizationUserId;

      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
          userType: UserType.WRITE,
        })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully updated in the organization',
            organizationUserId: newOrganizationUserId,
          }),
        );

      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .then((res) => expect(res.userType).toBe(UserType.WRITE));
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
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'The request user is not part of this organization',
            statusCode: 403,
          }),
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
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Not Found',
            message: 'User not found in the organization',
            statusCode: 404,
          }),
        );
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
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: ['userType must be one of the following values: owner, write, read'],
            statusCode: 400,
          });
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
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: 'New user permission must be provided',
            statusCode: 400,
          });
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
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to change inviteAccepted',
            statusCode: 403,
          });
        });
    });

    it('User permission not changed - Body is empty', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: [
              'organizationId must be a number conforming to the specified constraints',
              'userId must be a number conforming to the specified constraints',
            ],
            statusCode: 400,
          });
        });
    });

    it('User permission not changed - The request user is not in the organization', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'The request user is not part of this organization',
            statusCode: 403,
          }),
        );
    });

    it('User permission not changed - The request user is not the owner', async () => {
      // User added to the organization, with write perms
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(201)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully added to the organization',
            organizationUserId: expect.any(Number),
          }),
        );

      // Send the request as the write user
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );
    });
  });

  describe('Update user invite status', () => {
    let newOrgUser: object;
    let newOrgUserInvite: object;
    let newOrganizationUserId: number;

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationColab)
        .expect(201);

      testOrganizationId = body.organizationId;

      newOrgUser = {
        userId: userId2,
        organizationId: testOrganizationId,
        userType: UserType.READ,
      };

      newOrgUserInvite = {
        userId: userId2,
        organizationId: testOrganizationId,
        inviteAccepted: true,
      };

      const resp = await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrgUser)
        .expect(201);

      newOrganizationUserId = resp.body.organizationUserId;

      // Check before updating
      expect(
        await db
          .getRepository(OrganizationUser)
          .findOneBy({
            organizationId: testOrganizationId,
            userId: userId2,
          })
          .then((res) => res.inviteAccepted),
      ).toBe(false);
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch(`/organizations/updateUser/invite`).expect(401);
    });

    it('User accepted the invite request', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newOrgUserInvite)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully updated in the organization',
            organizationUserId: newOrganizationUserId,
          }),
        );

      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .then((res) => expect(res.inviteAccepted).toBe(true));
    });

    it('User refused the invite request', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUserInvite,
          inviteAccepted: false,
        })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully removed from the organization',
            organizationUserId: newOrganizationUserId,
          }),
        );

      expect(
        await db.getRepository(OrganizationUser).findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        }),
      ).toBeNull();
    });

    it('User invite status not changed - Organization not found', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUserInvite,
          organizationId: 99999,
        })
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Not Found',
            message: 'User not found in the organization',
            statusCode: 404,
          });
        });
    });

    it('User invite status not changed - User not found', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUserInvite,
          userId: 99999,
        })
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          });
        });
    });

    it('User invite status not changed - inviteAccepted invalid', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUserInvite,
          inviteAccepted: 'invalidType',
        })
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: ['inviteAccepted must be a boolean value'],
            statusCode: 400,
          });
        });
    });

    it('User invite status not changed - inviteAccepted is empty', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: 'New user invite status must be provided',
            statusCode: 400,
          });
        });
    });

    it('User invite status not changed - User type sent', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUserInvite,
          userType: UserType.OWNER,
        })
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to change userType',
            statusCode: 403,
          });
        });
    });

    it('User invite status not changed - Body is empty', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({})
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: [
              'organizationId must be a number conforming to the specified constraints',
              'userId must be a number conforming to the specified constraints',
            ],
            statusCode: 400,
          });
        });
    });

    it('User invite status not changed - The request user is no the same', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrgUserInvite)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );
    });
  });

  describe('Remove user from an organization', () => {
    let organizationUserId;

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationColab)
        .expect(201);
      testOrganizationId = body.organizationId;

      const newOrgUser = {
        userId: userId2,
        organizationId: testOrganizationId,
        userType: UserType.READ,
      };

      const resp = await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrgUser)
        .expect(201);

      organizationUserId = resp.body.organizationUserId;

      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        })
        .then((res) => expect(res).toMatchObject(newOrgUser));
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}/${userId2}`)
        .expect(401);
    });

    it('User removed successfully - Request from organization owner', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}/${userId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully removed from the organization',
            organizationUserId,
          }),
        );

      expect(
        await db.getRepository(OrganizationUser).findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        }),
      ).toBeNull();
    });

    it('User removed successfully - Request from user itself', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}/${userId2}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'User successfully removed from the organization',
            organizationUserId,
          }),
        );

      expect(
        await db.getRepository(OrganizationUser).findOneBy({
          organizationId: testOrganizationId,
          userId: userId2,
        }),
      ).toBeNull();
    });

    it('User not removed - Request from a not owner user', async () => {
      const janeOrgUser = {
        userId: userId3,
        organizationId: testOrganizationId,
        userType: UserType.READ,
      };

      // Add the 3rd user as a READ member of the org
      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(janeOrgUser)
        .expect(201);

      // Check if the user was added
      await db
        .getRepository(OrganizationUser)
        .findOneBy({
          organizationId: testOrganizationId,
          userId: userId3,
        })
        .then((res) => expect(res).toMatchObject(janeOrgUser));

      // Send the request to delete 2nd user as the 3rd user
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}/${userId2}`)
        .set('Authorization', `Bearer ${authToken3}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );
    });

    it('User not removed - Request from a user outside of the organization', async () => {
      // Send the request to delete 2nd user as the 3rd user, outside of the org
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}/${userId2}`)
        .set('Authorization', `Bearer ${authToken3}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );
    });

    it('User not removed - User not found', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Not Found',
            message: 'User not found in this organization',
            statusCode: 404,
          }),
        );
    });

    it('User not removed - Organization not found', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/99999/${userId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have permission to do this',
            statusCode: 403,
          }),
        );
    });

    it('User not removed - Missing user param', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Not Found',
            message: 'Cannot DELETE /organizations/removeUser/1',
            statusCode: 404,
          }),
        );
    });

    it('User not removed - Missing organization and user param', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: 'Invalid organizationId provided',
            statusCode: 400,
          }),
        );
    });
  });

  describe('Get my organizations', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/organizations/my').expect(401);
    });

    it('Get my organizations successfully', async () => {
      const indivOrgs = await Promise.all(
        [...Array(3)].map(() =>
          request(app.getHttpServer())
            .post('/organizations')
            .set('Authorization', `Bearer ${authToken}`)
            .send(testOrganizationIndiv)
            .expect(201)
            .then((res) => res.body.organizationId),
        ),
      );

      const collabOrgs = await Promise.all(
        [...Array(3)].map(() =>
          request(app.getHttpServer())
            .post('/organizations')
            .set('Authorization', `Bearer ${authToken}`)
            .send(testOrganizationColab)
            .expect(201)
            .then((res) => res.body.organizationId),
        ),
      );

      const allOrgIds = [...indivOrgs, ...collabOrgs];

      const { body } = await request(app.getHttpServer())
        .get('/organizations/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(body).toHaveLength(6);

      body.forEach((organization) => {
        expect([OrganizationType.INDIVIDUAL, OrganizationType.COLLABORATIVE]).toContain(organization.organizationType);

        expect(allOrgIds).toContain(organization.organizationId);

        expect(organization).toStrictEqual({
          organizationId: expect.any(Number),
          organizationType: expect.any(String),
          name: testOrganizationIndiv.name,
          description: testOrganizationIndiv.description,
        });
      });
    });

    it('No organizations found', () => {
      return request(app.getHttpServer())
        .get('/organizations/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toMatchObject({
            error: 'Not Found',
            message: 'No organizations found for this user',
            statusCode: 404,
          });
        });
    });
  });

  describe('Get organization data', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/organizations/data/1').expect(401);
    });

    it('Get organization data successfully', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationColab)
        .expect(201);
      testOrganizationId = body.organizationId;

      await request(app.getHttpServer())
        .post('/organizations/addUser')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId2,
          organizationId: testOrganizationId,
          userType: UserType.READ,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/organizations/addUser')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId3,
          organizationId: testOrganizationId,
          userType: UserType.WRITE,
        })
        .expect(201);

      const { body: orgData } = await request(app.getHttpServer())
        .get(`/organizations/data/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(orgData).toStrictEqual({
        organizationId: 1,
        name: 'Test Org',
        description: 'Test Description',
        organizationType: 'collaborative',
        organizationUsers: [
          {
            user: 'john_doe',
            userType: 'owner',
            inviteAccepted: true,
          },
          {
            user: 'new_john',
            userType: 'read',
            inviteAccepted: false,
          },
          {
            user: 'jane_doe',
            userType: 'write',
            inviteAccepted: false,
          },
        ],
      });
    });

    it('Request from an user outside of the organization', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrganizationColab)
        .expect(201);
      testOrganizationId = body.organizationId;

      await request(app.getHttpServer())
        .get(`/organizations/data/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'The request user is not part of this organization',
            statusCode: 403,
          });
        });
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .get('/organizations/data/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'The request user is not part of this organization',
            statusCode: 403,
          }),
        );
    });
  });
});
