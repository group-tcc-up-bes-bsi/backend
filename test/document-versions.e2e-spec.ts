import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { Document } from 'src/documents/entities/document.entity';
import { flushDatabase, flushDatabaseTable, saveTestUser } from './helpers/database-utils';
import * as epUtils from './helpers/endpoint-utils';
import { Organization, OrganizationType } from 'src/organizations/entities/organization.entity';
import { DocumentVersion } from 'src/document-versions/entities/document-version.entity';
import { OrganizationUser } from 'src/organizations/entities/organization-user.entity';
import * as path from 'path';
import { readFileSync, rmSync } from 'fs';

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

const testDocumentVersion = {
  name: 'Document_v1',
  documentId: null,
};

const testDocumentFilePath = path.join(__dirname, './test_files/lorem.docx');

//////////////////////////////////////////////////////////////////////
// Testcases
///////////////////////////////////////////////////////////////////////

describe('E2E - DocumentVersions Endpoints', () => {
  let app: INestApplication;
  let db: DataSource;
  let userId: number;
  let authToken: string;
  let userId2: number;
  let authToken2: string;
  let organizationId: number;
  let documentId: number;
  let savedFilePath: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);
    await flushDatabase(db);

    userId = await saveTestUser(db, testUser);
    authToken = await epUtils.makeTestLogin(app, testUser);

    userId2 = await saveTestUser(db, testUser2);
    authToken2 = await epUtils.makeTestLogin(app, testUser2);
  });

  beforeEach(async () => {
    await flushDatabaseTable(db, [DocumentVersion, Document, OrganizationUser, Organization]);

    organizationId = await epUtils.createTestOrganization(app, authToken, testOrganization);
    testDocument.organizationId = organizationId;

    const { body } = await request(app.getHttpServer())
      .post('/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testDocument)
      .expect(201);

    documentId = body.documentId;
    testDocumentVersion.documentId = documentId;

    savedFilePath = `${process.env.FILE_SAVE_PATH}/org_${organizationId}/doc_${testDocumentVersion.documentId}/version_${testDocumentVersion.name}.docx`;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() =>
    rmSync(`${process.env.FILE_SAVE_PATH}/org_${organizationId}/doc_${testDocumentVersion.documentId}/`, {
      force: true,
      recursive: true,
    }),
  );

  describe('Create', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .post('/document-versions')
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(401);
    });

    it('Document Version created successfully', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);

      // Check response body
      expect(body).toMatchObject({
        message: 'Document Version successfully created',
        documentVersionId: expect.any(Number),
      });

      // Check database entry
      expect(
        await db.getRepository(DocumentVersion).findOne({
          where: { documentId: body.documentVersionId },
        }),
      ).toMatchObject({
        ...testDocumentVersion,
        documentVersionId: body.documentVersionId,
        filePath: savedFilePath,
        creationDate: expect.any(Date),
        userId,
      });

      // Check if file was saved correctly
      expect(readFileSync(savedFilePath)).toEqual(readFileSync(testDocumentFilePath));
    });

    it('Document Version created successfully - write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const { body } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken2}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);

      // Check response body
      expect(body).toMatchObject({
        message: 'Document Version successfully created',
        documentVersionId: expect.any(Number),
      });

      // Check database entry
      expect(
        await db.getRepository(DocumentVersion).findOne({
          where: { documentId: body.documentVersionId },
        }),
      ).toMatchObject({
        ...testDocumentVersion,
        documentVersionId: body.documentVersionId,
        filePath: savedFilePath,
        creationDate: expect.any(Date),
        userId: userId2,
      });

      // Check if file was saved correctly
      expect(readFileSync(savedFilePath)).toEqual(readFileSync(testDocumentFilePath));
    });

    it('Not created - Trying to create a version with same name', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);

      expect(body).toMatchObject({
        message: 'Document Version successfully created',
        documentVersionId: expect.any(Number),
      });

      await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: 400,
            message: 'A version with this name already exists for this document',
            error: 'Bad Request',
          });
        });

      expect(
        await db.getRepository(DocumentVersion).find({
          where: { documentId: body.documentVersionId },
        }),
      ).toHaveLength(1);
    });

    it('Not created - Missing fields', async () => {
      await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: ['name must be a string', 'documentId must be a number conforming to the specified constraints'],
            statusCode: 400,
          });
        });
    });

    it('Not created - Document does not exist', async () => {
      await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', '9999')
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: 404,
            message: 'Document not found',
            error: 'Not Found',
          });
        });
    });

    it('Not created - User have read permission', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken2}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have edit permissions in this organization',
            statusCode: 403,
          });
        });
    });

    it('Not created - User not in organization', async () => {
      await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken2}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have edit permissions in this organization',
            statusCode: 403,
          });
        });
    });
  });

  describe('Update', () => {
    let documentVersionId: number;

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            message: 'Document Version successfully created',
            documentVersionId: expect.any(Number),
          });
        });

      documentVersionId = body.documentVersionId;
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer()).patch(`/document-versions/${documentVersionId}`).expect(401);
    });

    it('Document Version updated successfully', async () => {
      const newName = 'Document v1.1';

      const { body } = await request(app.getHttpServer())
        .patch(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: newName })
        .expect(200);

      expect(body).toMatchObject({
        message: 'Document Version successfully updated',
        documentVersionId,
      });

      expect(await db.getRepository(DocumentVersion).findOneBy({ documentVersionId })).toMatchObject({
        ...testDocumentVersion,
        documentVersionId,
        name: newName,
        filePath: savedFilePath,
        creationDate: expect.any(Date),
        userId,
      });
    });

    it('Document Version updated successfully - write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const newName = 'Document v1.1';

      const { body } = await request(app.getHttpServer())
        .patch(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: newName })
        .expect(200);

      expect(body).toMatchObject({
        message: 'Document Version successfully updated',
        documentVersionId,
      });

      expect(await db.getRepository(DocumentVersion).findOneBy({ documentVersionId })).toMatchObject({
        ...testDocumentVersion,
        documentVersionId,
        name: newName,
        filePath: savedFilePath,
        creationDate: expect.any(Date),
        userId,
      });
    });

    it('Not updated - Document Version does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/document-versions/9999`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'some name' })
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: 404,
            message: 'Document Version not found',
            error: 'Not Found',
          });
        });
    });

    it('Not updated - Missing fields', async () => {
      await request(app.getHttpServer())
        .patch(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Bad Request',
            message: ['name must be a string'],
            statusCode: 400,
          });
        });
    });

    it('Not updated - User have read permission', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      await request(app.getHttpServer())
        .patch(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: 'some name' })
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have edit permissions in this organization',
            statusCode: 403,
          });
        });

      expect(await db.getRepository(DocumentVersion).findOneBy({ documentVersionId })).toMatchObject(
        testDocumentVersion,
      );
    });

    it('Not updated - User not in organization', async () => {
      await request(app.getHttpServer())
        .patch(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: 'some name' })
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have edit permissions in this organization',
            statusCode: 403,
          });
        });

      expect(await db.getRepository(DocumentVersion).findOneBy({ documentVersionId })).toMatchObject(
        testDocumentVersion,
      );
    });
  });

  describe('Delete', () => {
    let documentVersionId: number;

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            message: 'Document Version successfully created',
            documentVersionId: expect.any(Number),
          });
        });

      documentVersionId = body.documentVersionId;
    });

    it('Request without authentication', () => {
      return request(app.getHttpServer()).delete(`/document-versions/${documentVersionId}`).expect(401);
    });

    it('Document Version removed successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            message: 'Document Version successfully removed',
            documentVersionId,
          });
        });

      expect(await db.getRepository(DocumentVersion).findOneBy({ documentVersionId })).toBeNull();
    });

    it('Not removed - Document Version does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/document-versions/9999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: 404,
            message: 'Document Version not found',
            error: 'Not Found',
          });
        });
    });

    it('Not removed - User have write permission', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      await request(app.getHttpServer())
        .delete(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have owner permissions in this organization',
            statusCode: 403,
          });
        });

      expect(await db.getRepository(DocumentVersion).findOneBy({ documentVersionId })).toBeDefined();
    });

    it('Not removed - User have read permission', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      await request(app.getHttpServer())
        .delete(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have owner permissions in this organization',
            statusCode: 403,
          });
        });

      expect(await db.getRepository(DocumentVersion).findOneBy({ documentVersionId })).toBeDefined();
    });

    it('Not removed - User not in organization', async () => {
      await request(app.getHttpServer())
        .delete(`/document-versions/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have owner permissions in this organization',
            statusCode: 403,
          });
        });

      expect(await db.getRepository(DocumentVersion).findOneBy({ documentVersionId })).toBeDefined();
    });
  });

  describe('Get by Id', () => {
    it('Request without authentication', async () => {
      return request(app.getHttpServer()).get(`/document-versions/id/1`).send(testDocumentVersion).expect(401);
    });

    it('Document Version retrieved successfully', async () => {
      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      const { body } = await request(app.getHttpServer())
        .get(`/document-versions/id/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(body).toMatchObject({
        documentVersionId: documentVersionId,
        name: testDocumentVersion.name,
        creationDate: expect.any(String),
        documentId,
        userId,
      });
    });

    it('Document Version retrieved successfully - write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      const { body } = await request(app.getHttpServer())
        .get(`/document-versions/id/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(body).toMatchObject({
        documentVersionId: documentVersionId,
        name: testDocumentVersion.name,
        creationDate: expect.any(String),
        documentId,
        userId,
      });
    });

    it('Document Version retrieved successfully - read permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      const { body } = await request(app.getHttpServer())
        .get(`/document-versions/id/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(body).toMatchObject({
        documentVersionId: documentVersionId,
        name: testDocumentVersion.name,
        creationDate: expect.any(String),
        documentId,
        userId,
      });
    });

    it('Not retrieved - Document Version does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/document-versions/id/9999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: 404,
            message: 'Document Version not found',
            error: 'Not Found',
          });
        });
    });

    it('Not retrieved - User not in organization', async () => {
      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      await request(app.getHttpServer())
        .get(`/document-versions/id/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have read permissions in this organization',
            statusCode: 403,
          });
        });
    });
  });

  describe('Get by Document', () => {
    it('Request without authentication', async () => {
      return request(app.getHttpServer()).get(`/document-versions/document/1`).expect(401);
    });

    it('Document Versions retrieved successfully', async () => {
      const versionNames = ['v1', 'v2', 'v3'];

      for (const name of versionNames) {
        await request(app.getHttpServer())
          .post('/document-versions')
          .set('Authorization', `Bearer ${authToken}`)
          .field('documentId', testDocumentVersion.documentId)
          .field('name', name)
          .attach('file', testDocumentFilePath)
          .expect(201);
      }

      const { body } = await request(app.getHttpServer())
        .get(`/document-versions/document/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(body).toHaveLength(versionNames.length);

      body.forEach((version) => {
        expect(version).toMatchObject({
          documentVersionId: expect.any(Number),
          name: expect.any(String),
          creationDate: expect.any(String),
          documentId,
          userId,
        });

        expect(versionNames).toContain(version.name);
      });
    });

    it('Document Versions retrieved successfully - write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const versionNames = ['v1', 'v2', 'v3'];

      for (const name of versionNames) {
        await request(app.getHttpServer())
          .post('/document-versions')
          .set('Authorization', `Bearer ${authToken}`)
          .field('documentId', testDocumentVersion.documentId)
          .field('name', name)
          .attach('file', testDocumentFilePath)
          .expect(201);
      }

      const { body } = await request(app.getHttpServer())
        .get(`/document-versions/document/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(body).toHaveLength(versionNames.length);

      body.forEach((version) => {
        expect(version).toMatchObject({
          documentVersionId: expect.any(Number),
          name: expect.any(String),
          creationDate: expect.any(String),
          documentId,
          userId,
        });

        expect(versionNames).toContain(version.name);
      });
    });

    it('Document Versions retrieved successfully - read permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      const versionNames = ['v1', 'v2', 'v3'];

      for (const name of versionNames) {
        await request(app.getHttpServer())
          .post('/document-versions')
          .set('Authorization', `Bearer ${authToken}`)
          .field('documentId', testDocumentVersion.documentId)
          .field('name', name)
          .attach('file', testDocumentFilePath)
          .expect(201);
      }

      const { body } = await request(app.getHttpServer())
        .get(`/document-versions/document/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(body).toHaveLength(versionNames.length);

      body.forEach((version) => {
        expect(version).toMatchObject({
          documentVersionId: expect.any(Number),
          name: expect.any(String),
          creationDate: expect.any(String),
          documentId,
          userId,
        });

        expect(versionNames).toContain(version.name);
      });
    });

    it('Not retrieved - Document does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/document-versions/document/9999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: 404,
            message: 'Document not found',
            error: 'Not Found',
          });
        });
    });

    it('Not retrieved - User not in the organization', async () => {
      await request(app.getHttpServer())
        .get(`/document-versions/document/${documentId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have read permissions in this organization',
            statusCode: 403,
          });
        });
    });
  });

  describe('Get by User', () => {
    it('Request without authentication', async () => {
      return request(app.getHttpServer()).get(`/document-versions/user/1`).expect(401);
    });

    it('Document Versions retrieved successfully', async () => {
      const versionNames = ['v1', 'v2', 'v3'];

      for (const name of versionNames) {
        await request(app.getHttpServer())
          .post('/document-versions')
          .set('Authorization', `Bearer ${authToken}`)
          .field('documentId', testDocumentVersion.documentId)
          .field('name', name)
          .attach('file', testDocumentFilePath)
          .expect(201);
      }

      const { body } = await request(app.getHttpServer())
        .get(`/document-versions/user/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(body).toHaveLength(versionNames.length);

      body.forEach((version) => {
        expect(version).toMatchObject({
          documentVersionId: expect.any(Number),
          name: expect.any(String),
          creationDate: expect.any(String),
          documentId,
          userId,
        });

        expect(versionNames).toContain(version.name);
      });

      // User 2 is not part of the organization, should return empty.
      await request(app.getHttpServer())
        .get(`/document-versions/user/${userId2}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            message: 'No Document Versions found for this user',
            error: 'Not Found',
            statusCode: 404,
          });
        });
    });

    it('Not retrieved - User is not the same as the authenticated user', async () => {
      await request(app.getHttpServer())
        .get(`/document-versions/user/${userId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You can only view your own document versions',
            statusCode: 403,
          });
        });
    });
  });

  describe('Download', () => {
    it('Request without authentication', async () => {
      return request(app.getHttpServer()).get(`/document-versions/download/1`).expect(401);
    });

    it('Document Version downloaded successfully', async () => {
      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      const { headers, body } = await request(app.getHttpServer())
        .get(`/document-versions/download/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .buffer()
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        })
        .expect(200);

      expect(headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(headers['content-disposition']).toBe(`attachment; filename="version_${testDocumentVersion.name}.docx"`);
      expect(headers['content-length']).toBe(`${body.length}`);
      expect(body).toEqual(readFileSync(testDocumentFilePath));
    });

    it('Document Version downloaded successfully - write permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'WRITE',
      });

      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      const { body, headers } = await request(app.getHttpServer())
        .get(`/document-versions/download/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .buffer()
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        })
        .expect(200);

      expect(headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(headers['content-disposition']).toBe(`attachment; filename="version_${testDocumentVersion.name}.docx"`);
      expect(headers['content-length']).toBe(`${body.length}`);
      expect(body).toEqual(readFileSync(testDocumentFilePath));
    });

    it('Document Version downloaded successfully - read permissions', async () => {
      await epUtils.addToTestOrganization(app, authToken, {
        userId: userId2,
        organizationId,
        role: 'READ',
      });

      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      const { body, headers } = await request(app.getHttpServer())
        .get(`/document-versions/download/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .buffer()
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        })
        .expect(200);

      expect(headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(headers['content-disposition']).toBe(`attachment; filename="version_${testDocumentVersion.name}.docx"`);
      expect(headers['content-length']).toBe(`${body.length}`);
      expect(body).toEqual(readFileSync(testDocumentFilePath));
    });

    it('Not downloaded - Document Version does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/document-versions/download/9999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: 404,
            message: 'Document Version not found',
            error: 'Not Found',
          });
        });
    });

    it('Not downloaded - User not in organization', async () => {
      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      await request(app.getHttpServer())
        .get(`/document-versions/download/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            error: 'Forbidden',
            message: 'You do not have read permissions in this organization',
            statusCode: 403,
          });
        });
    });

    it('Not downloaded - File is missing', async () => {
      const { body: createBody } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentId', testDocumentVersion.documentId)
        .field('name', testDocumentVersion.name)
        .attach('file', testDocumentFilePath)
        .expect(201);
      const documentVersionId = createBody.documentVersionId;

      // Remove the file
      rmSync(savedFilePath);

      await request(app.getHttpServer())
        .get(`/document-versions/download/${documentVersionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: 500,
            message: 'Internal server error',
          });
        });
    });
  });
});
