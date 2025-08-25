import { INestApplication } from '@nestjs/common';
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
