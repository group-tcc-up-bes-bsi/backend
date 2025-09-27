import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { Document } from 'src/documents/entities/document.entity';
import { flushDatabase, flushDatabaseTable, saveTestUser } from './helpers/database-utils';
import * as epUtils from './helpers/endpoint-utils';
import { OrganizationType } from 'src/organizations/entities/organization.entity';

//////////////////////////////////////////////////////////////////////
// Test entity objects
///////////////////////////////////////////////////////////////////////

const testUser = {
  username: 'john_doe',
  password: '123',
};

const testUser2 = {
  username: 'jane_doe',
  password: '123',
};

const testOrganization = {
  name: 'Test Org',
  description: 'Test Description',
  organizationType: OrganizationType.COLLABORATIVE,
};

const testDocument = {
  name: 'test document',
  type: 'PDF',
  description: 'some test document',
  organizationId: null,
};

//////////////////////////////////////////////////////////////////////
// Testcases
///////////////////////////////////////////////////////////////////////

describe('E2E - Documents Endpoints', () => {
  let app: INestApplication;
  let db: DataSource;
  let organizationId: number;
  let authToken: string;
  let authToken2: string;
  let userId2: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);
    await flushDatabase(db);

    await saveTestUser(db, testUser);
    authToken = await epUtils.makeTestLogin(app, testUser);
    organizationId = await epUtils.createTestOrganization(app, authToken, testOrganization);
    testDocument.organizationId = organizationId;

    userId2 = await saveTestUser(db, testUser2);
    authToken2 = await epUtils.makeTestLogin(app, testUser2);
  });

  beforeEach(async () => {
    await flushDatabaseTable(db, [Document]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).post('/documents').send(testDocument).expect(401);
    });

    it('Document created successfully', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      expect(body).toMatchObject({
        message: 'Document successfully created',
        documentId: expect.any(Number),
      });

      expect(
        await db.getRepository(Document).findOne({
          where: { documentId: body.documentId },
          relations: ['organization'],
        }),
      ).toMatchObject({
        ...testDocument,
        documentId: body.documentId,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
        organization: testOrganization,
      });
    });

    it('Missing fields', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(body).toMatchObject({
        message: [
          'name must be a string',
          'type must be a string',
          'description must be a string',
          'organizationId must be a number conforming to the specified constraints',
        ],
      });
    });
  });

  describe('Read - Get all organization documents', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get(`/documents/organization/${organizationId}`).expect(401);
    });

    it('Get all documents from organization', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get(`/documents/organization/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          body.forEach((document) => {
            expect(document).toMatchObject({
              ...testDocument,
              documentId: expect.any(Number),
              creationDate: expect.any(String),
              lastModifiedDate: expect.any(String),
            });
          });
          expect(body).toHaveLength(3);
        });
    });

    it('Get all documents from organization - other user with owner permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'OWNER',
      });

      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get(`/documents/organization/${organizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect(({ body }) => {
          body.forEach((document) => {
            expect(document).toMatchObject({
              ...testDocument,
              documentId: expect.any(Number),
              creationDate: expect.any(String),
              lastModifiedDate: expect.any(String),
            });
          });
          expect(body).toHaveLength(3);
        });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Get all documents from organization - other user with write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get(`/documents/organization/${organizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect(({ body }) => {
          body.forEach((document) => {
            expect(document).toMatchObject({
              ...testDocument,
              documentId: expect.any(Number),
              creationDate: expect.any(String),
              lastModifiedDate: expect.any(String),
            });
          });
          expect(body).toHaveLength(3);
        });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Get all documents from organization - other user with read permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get(`/documents/organization/${organizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect(({ body }) => {
          body.forEach((document) => {
            expect(document).toMatchObject({
              ...testDocument,
              documentId: expect.any(Number),
              creationDate: expect.any(String),
              lastModifiedDate: expect.any(String),
            });
          });
          expect(body).toHaveLength(3);
        });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Get all documents from organization - user is not part of the organization', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get(`/documents/organization/${organizationId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You are not part of the organization',
            statusCode: 403,
          });
        });
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .get('/documents/organization/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You are not part of the organization',
            statusCode: 403,
          });
        });
    });
  });

  describe('Read - Get one', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/documents/id/1').expect(401);
    });

    it('Get document by ID', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .get(`/documents/id/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            ...testDocument,
            documentId,
            creationDate: expect.any(String),
            lastModifiedDate: expect.any(String),
          });
        });
    });

    it('Get document by ID - other user with write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .get(`/documents/id/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            ...testDocument,
            documentId,
            creationDate: expect.any(String),
            lastModifiedDate: expect.any(String),
          });
        });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Get document by ID - other user with read permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .get(`/documents/id/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            ...testDocument,
            documentId,
            creationDate: expect.any(String),
            lastModifiedDate: expect.any(String),
          });
        });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Get document by ID - user is not part of the organization', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .get(`/documents/id/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You are not part of the organization',
            statusCode: 403,
          });
        });
    });

    it('Document not found', () => {
      return request(app.getHttpServer())
        .get('/documents/id/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Not Found',
            message: 'Document not found',
            statusCode: 404,
          });
        });
    });
  });

  describe('Update', () => {
    const newDocument = {
      name: 'My Document',
      type: 'DOCX',
      description: 'My MS Word document',
    };

    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch('/documents/1').send(testDocument).expect(401);
    });

    it('Document updated successfully', async () => {
      const documentId = (
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201)
      ).body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newDocument)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Document successfully updated',
            documentId,
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...newDocument,
        documentId,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
      });
    });

    it('Document updated successfully - only 1 field', async () => {
      const documentId = (
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201)
      ).body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'updated document' })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Document successfully updated',
            documentId,
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...testDocument,
        name: 'updated document',
        documentId,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
      });
    });

    it('Document updated successfully - other user with owner permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'OWNER',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newDocument)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Document successfully updated',
            documentId,
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...newDocument,
        documentId,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
      });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Document updated successfully - other user with write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newDocument)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Document successfully updated',
            documentId,
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...newDocument,
        documentId,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
      });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Document not updated - other user with read permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newDocument)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'You do not have edit permissions in this organization',
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...testDocument,
        documentId,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
      });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Document not updated - user is not part of the organization', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(newDocument)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'You do not have edit permissions in this organization',
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...testDocument,
        documentId,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
      });
    });

    it('Document not found', () => {
      return request(app.getHttpServer())
        .patch('/documents/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newDocument)
        .expect(404);
    });
  });

  describe('Update active version ID', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch('/documents/1/active-version/1').send(testDocument).expect(401);
    });

    it('Active version ID updated successfully', async () => {
      const documentId = (
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201)
      ).body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}/active-version/44`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Document active version successfully updated',
            documentId,
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...testDocument,
        documentId,
        activeVersionId: 44,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
      });
    });

    it('Active version ID updated successfully - other user with write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}/active-version/44`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Document active version successfully updated',
            documentId,
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...testDocument,
        documentId,
        activeVersionId: 44,
        creationDate: expect.any(Date),
        lastModifiedDate: expect.any(Date),
      });

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Active version ID not updated - other user with read permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}/active-version/44`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'You do not have edit permissions in this organization',
          }),
        );

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Document not found', () => {
      return request(app.getHttpServer())
        .patch('/documents/999/active-version/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Delete', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).delete('/documents/1').send(testDocument).expect(401);
    });

    it('Document deleted successfully', async () => {
      const documentId = (
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201)
      ).body.documentId;

      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Document successfully removed',
            documentId,
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toBeNull();
    });

    it('Document deleted successfully - other user with owner permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'OWNER',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'Document successfully removed',
            documentId,
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toBeNull();

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Document not deleted - other user with write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'You do not have owner permissions in this organization',
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toBeDefined();

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Document not deleted - other user with read permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'You do not have owner permissions in this organization',
          }),
        );

      expect(await db.getRepository(Document).findOneBy({ documentId })).toBeDefined();

      await epUtils.removeFromTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
      });
    });

    it('Document not deleted - user is not part of the organization', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            message: 'You do not have owner permissions in this organization',
          }),
        );
    });

    it('Document not found', () => {
      return request(app.getHttpServer())
        .delete('/documents/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('User Favorite Documents', () => {
    let documentId: number;

    beforeEach(async () => {
      documentId = (
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201)
      ).body.documentId;
    });

    describe('Add document to user favorites', () => {
      afterEach(() => {
        return request(app.getHttpServer())
          .delete(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`);
      });

      it('Request without authentication', () => {
        return request(app.getHttpServer()).post(`/users/favorites/documents/${documentId}`).expect(401);
      });

      it('Add document to favorites successfully', async () => {
        await request(app.getHttpServer())
          .post(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201)
          .expect(({ body }) => {
            expect(body).toMatchObject({
              message: 'Document added to favorites',
              documentId,
            });
          });
      });

      it('Add same document twice returns appropriate message', async () => {
        await request(app.getHttpServer())
          .post(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        await request(app.getHttpServer())
          .post(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(409)
          .expect(({ body }) => {
            expect(body).toMatchObject({
              message: 'Document already in favorites',
              statusCode: 409,
            });
          });
      });
    });

    describe('Remove document from user favorites', () => {
      it('Request without authentication', () => {
        return request(app.getHttpServer()).delete(`/users/favorites/documents/${documentId}`).expect(401);
      });

      it('Remove document from favorites successfully', async () => {
        await request(app.getHttpServer())
          .post(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        await request(app.getHttpServer())
          .delete(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect(({ body }) => {
            expect(body).toMatchObject({
              message: 'Document removed from favorites',
              documentId,
            });
          });
      });

      it('Remove document not in favorites returns appropriate message', async () => {
        await request(app.getHttpServer())
          .delete(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404)
          .expect(({ body }) => {
            expect(body).toMatchObject({
              message: `Document ${documentId} not in favorites`,
              statusCode: 404,
            });
          });
      });
    });

    describe('Get user favorited documents', () => {
      it('Request without authentication', () => {
        return request(app.getHttpServer()).get('/users/favorites/documents').expect(401);
      });

      it('Get favorite documents - empty list', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/users/favorites/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(0);
      });

      it('Get favorite documents - after adding', async () => {
        await request(app.getHttpServer())
          .post(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        const { body } = await request(app.getHttpServer())
          .get('/users/favorites/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(body)).toBe(true);
        expect(body.some((doc) => doc.documentId === documentId)).toBe(true);

        await request(app.getHttpServer())
          .delete(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`);
      });

      it('Get favorite documents - after removing', async () => {
        await request(app.getHttpServer())
          .post(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        await request(app.getHttpServer())
          .delete(`/users/favorites/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const { body } = await request(app.getHttpServer())
          .get('/users/favorites/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(body.some((doc) => doc.documentId === documentId)).toBe(false);
      });
    });
  });
});
