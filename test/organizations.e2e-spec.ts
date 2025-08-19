import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Organization, OrganizationType } from 'src/organizations/entities/organization.entity';
import { OrganizationUser, UserType } from 'src/organizations/entities/organization-user.entity';

describe.skip('E2E - Organizations Endpoints', () => {
  let app: INestApplication;
  let db: DataSource;
  let authToken: string;
  let authToken2: string;
  let authToken3: string;
  let userId: number;
  let userId2: number;
  let userId3: number;
  let testOrganizationId: number;

  const testOrganization = {
    name: 'Test Org',
    description: 'Test Description',
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
    await db.getRepository(OrganizationUser).clear();
    await db.getRepository(Organization).clear();
    await db.getRepository(User).clear();
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    const user = await db.getRepository(User).save({
      username: 'john_doe',
      password: '123',
      email: 'test@example.com',
    });
    userId = user.userId;

    authToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: 'test@example.com', password: '123' })
    ).body.token;

    const user2 = await db.getRepository(User).save({
      username: 'new_john',
      password: '1234',
      email: 'newTest@example.com',
    });
    userId2 = user2.userId;

    authToken2 = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: 'newTest@example.com', password: '1234' })
    ).body.token;

    const user3 = await db.getRepository(User).save({
      username: 'jane_doe',
      password: '123',
      email: 'jane@example.com',
    });
    userId3 = user3.userId;

    authToken3 = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: 'jane@example.com', password: '123' })
    ).body.token;
  });

  afterEach(async () => {
    testOrganizationId = null;
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.getRepository(OrganizationUser).clear();
    await db.getRepository(Organization).clear();
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
      expect(await db.getRepository(Organization).findOneBy({ organizationId })).toMatchObject({
        ...testOrganization,
        organizationId,
      });

      // Check OrganizationUser table in the database.
      expect(
        await db.getRepository(OrganizationUser).findOneBy({ user: { userId }, organization: { organizationId } }),
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
          'name must be a string',
          'description must be a string',
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
        name: 'Updated Org',
        description: 'Updated Description',
        organizationType: OrganizationType.COLLABORATIVE,
      };

      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedOrg)
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization successfully updated'));

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toMatchObject({
        ...updatedOrg,
        organizationId: testOrganizationId,
      });
    });

    it('Organization updated successfully - Only 1 param', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'updated organization' })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization successfully updated'));

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toMatchObject({
        ...testOrganization,
        name: 'updated organization',
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
      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toBeDefined();
      expect(
        await db.getRepository(OrganizationUser).findOneBy({ organization: { organizationId: testOrganizationId } }),
      ).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/organizations/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization successfully removed'));

      expect(await db.getRepository(Organization).findOneBy({ organizationId: testOrganizationId })).toBeNull();
      expect(
        await db.getRepository(OrganizationUser).findOneBy({ organization: { organizationId: testOrganizationId } }),
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
        .expect(({ text }) => expect(text).toBe('User successfully added to organization'));

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
        .expect(({ text }) => expect(text).toBe('User successfully added to organization'));

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
        .expect(({ body }) => expect(body.message).toBe('The request user is not part of this organization'));
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
        .expect(({ body }) => expect(body.message).toBe('The request user is not part of this organization'));
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
        .expect(403)
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
          .getRepository(OrganizationUser)
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
          .getRepository(OrganizationUser)
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
          .getRepository(OrganizationUser)
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
          .getRepository(OrganizationUser)
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
          .getRepository(OrganizationUser)
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
          .getRepository(OrganizationUser)
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
        .expect(({ body }) => expect(body.message).toBe('The request user is not part of this organization'));
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
          expect(res.body.message).toContain('userType must be one of the following values: owner, write, read');
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
        .expect(403)
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

    it('User permission not changed - The request user is not in the organization', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(403)
        .expect(({ body }) => expect(body.message).toBe('The request user is not part of this organization'));
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
        .expect(({ text }) => expect(text).toBe('User successfully added to organization'));

      // Send the request as the write user
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/permission`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUser,
          userType: UserType.WRITE,
        })
        .expect(403)
        .expect(({ body }) => expect(body.message).toBe('You do not have permission to do this'));
    });
  });

  describe('Update user invite status', () => {
    let newOrgUser: object;
    let newOrgUserInvite: object;

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
        userType: UserType.READ,
      };

      newOrgUserInvite = {
        userId: userId2,
        organizationId: testOrganizationId,
        inviteAccepted: true,
      };

      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrgUser)
        .expect(201);

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

    it('User invite status changed from false to true', async () => {
      // Only the user itself can change his invite status
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newOrgUserInvite)
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Organization user successfully updated'));

      expect(
        await db
          .getRepository(OrganizationUser)
          .findOneBy({
            organizationId: testOrganizationId,
            userId: userId2,
          })
          .then((res) => res.inviteAccepted),
      ).toBe(true);
    });

    it('User invite status not changed - cannot be false', async () => {
      // Only the user itself can change his invite status
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          ...newOrgUserInvite,
          inviteAccepted: false,
        })
        .expect(400)
        .expect(({ body }) => expect(body.message).toBe('New user invite status must be provided'));
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
        .expect(({ body }) => expect(body.message).toBe('User not found in the organization'));
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
        .expect(({ body }) => expect(body.message).toBe('You do not have permission to do this'));
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
        .expect((res) => {
          expect(res.body.message).toContain('inviteAccepted must be a boolean value');
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
        .expect((res) => {
          expect(res.body.message).toContain('New user invite status must be provided');
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
        .expect((res) => {
          expect(res.body.message).toContain('You do not have permission to change userType');
        });
    });

    it('User invite status not changed - Body is empty', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toMatchObject([
            'organizationId must be a number conforming to the specified constraints',
            'userId must be a number conforming to the specified constraints',
          ]);
        });
    });

    it('User invite status not changed - The request user is no the same', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/updateUser/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrgUserInvite)
        .expect(403)
        .expect(({ body }) => expect(body.message).toBe('You do not have permission to do this'));
    });
  });

  describe('Remove user from an organization', () => {
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

      const newOrgUser = {
        userId: userId2,
        organizationId: testOrganizationId,
        userType: UserType.READ,
      };

      await request(app.getHttpServer())
        .post(`/organizations/addUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrgUser)
        .expect(201);

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
        .expect(({ text }) => expect(text).toBe('User successfully removed from organization'));

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
        .expect(({ text }) => expect(text).toBe('User successfully removed from organization'));

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
        .expect(({ body }) => expect(body.message).toBe('You do not have permission to do this'));
    });

    it('User not removed - Request from a user outside of the organization', async () => {
      // Send the request to delete 2nd user as the 3rd user, outside of the org
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}/${userId2}`)
        .set('Authorization', `Bearer ${authToken3}`)
        .expect(403)
        .expect(({ body }) => expect(body.message).toBe('You do not have permission to do this'));
    });

    it('User not removed - User not found', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) => expect(body.message).toBe('User not found in this organization'));
    });

    it('User not removed - Organization not found', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/99999/${userId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect(({ body }) => expect(body.message).toBe('You do not have permission to do this'));
    });

    it('User not removed - Missing user param', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) => expect(body.message).toBe('Cannot DELETE /organizations/removeUser/1'));
    });

    it('User not removed - Missing organization and user param', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/removeUser`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect(({ body }) => expect(body.message).toBe('Invalid organizationId provided'));
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
            .send(testOrganization)
            .expect(201)
            .then((res) => res.body.organizationId),
        ),
      );

      const collabOrgs = await Promise.all(
        [...Array(3)].map(() =>
          request(app.getHttpServer())
            .post('/organizations')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ ...testOrganization, organizationType: OrganizationType.COLLABORATIVE })
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
          name: testOrganization.name,
          description: testOrganization.description,
        });
      });
    });

    it('No organizations found', () => {
      return request(app.getHttpServer())
        .get('/organizations/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('No organizations found for this user');
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
        .send({
          ...testOrganization,
          organizationType: OrganizationType.COLLABORATIVE,
        })
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
        organizationType: 'Collaborative',
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
        .send({
          ...testOrganization,
          organizationType: OrganizationType.COLLABORATIVE,
        })
        .expect(201);
      testOrganizationId = body.organizationId;

      await request(app.getHttpServer())
        .get(`/organizations/data/${testOrganizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body.message).toBe('The request user is not part of this organization');
        });
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .get('/organizations/data/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect(({ body }) => expect(body.message).toBe('The request user is not part of this organization'));
    });
  });
});
