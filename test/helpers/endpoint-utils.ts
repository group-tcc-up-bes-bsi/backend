import { INestApplication } from '@nestjs/common';
import { UserType } from 'src/organizations/entities/organization-user.entity';
import * as request from 'supertest';

/**
 * Creates a test organization.
 * @param {INestApplication} app - The Nest application instance.
 * @param {string} authToken - The authorization token.
 * @param {object} testOrganization - The organization data to create.
 * @returns {Promise<number>}The ID of the created organization.
 */
export async function createTestOrganization(app: INestApplication, authToken: string, testOrganization: object) {
  const response = await request(app.getHttpServer())
    .post('/organizations')
    .set('Authorization', `Bearer ${authToken}`)
    .send(testOrganization)
    .expect(201);
  return response.body.organizationId;
}

interface OrgOptions {
  userId: number | string;
  organizationId: number | string;
  role?: keyof typeof UserType;
}

/**
 * Adds a user to a test organization.
 * @param {INestApplication} app - The Nest application instance.
 * @param {string} authToken - The authorization token.
 * @param {OrgOptions} options - The options for adding a user to the organization.
 */
export async function addToTestOrganization(app: INestApplication, authToken: string, options: OrgOptions) {
  await request(app.getHttpServer())
    .post(`/organizations/addUser`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      userId: options.userId,
      organizationId: options.organizationId,
      userType: UserType[options.role],
    })
    .expect(201);
}

/**
 * Removes a user from a test organization.
 * @param {INestApplication} app - The Nest application instance.
 * @param {string} authToken - The authorization token.
 * @param {OrgOptions} options - The options for removing a user from the organization.
 */
export async function removeFromTestOrganization(app: INestApplication, authToken: string, options: OrgOptions) {
  await request(app.getHttpServer())
    .delete(`/organizations/removeUser/${options.organizationId}/${options.userId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);
}

/**
 * Tests the login functionality.
 * @param {INestApplication} app - The Nest application instance.
 * @param {object} testUser - The user credentials to log in.
 * @returns {Promise<string>} The JWT token if login is successful.
 */
export async function makeTestLogin(app: INestApplication, testUser: object) {
  const response = await request(app.getHttpServer()).post('/auth/login').send(testUser).expect(200);
  return response.body.token;
}
