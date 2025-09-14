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
  name: 'Document v1.0',
  documentId: null,
};

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).post('/document-versions').send(testDocumentVersion).expect(401);
    });

    it('Document Version created successfully', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocumentVersion)
        .expect(201);

      expect(body).toMatchObject({
        message: 'Document Version successfully created',
        documentVersionId: expect.any(Number),
      });

      expect(
        await db.getRepository(DocumentVersion).findOne({
          where: { documentId: body.documentVersionId },
        }),
      ).toMatchObject({
        ...testDocumentVersion,
        documentVersionId: body.documentVersionId,
        filePath: 'fakePath',
        creationDate: expect.any(Date),
        userId,
      });
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
        .send(testDocumentVersion)
        .expect(201);

      expect(body).toMatchObject({
        message: 'Document Version successfully created',
        documentVersionId: expect.any(Number),
      });

      expect(
        await db.getRepository(DocumentVersion).findOne({
          where: { documentId: body.documentVersionId },
        }),
      ).toMatchObject({
        ...testDocumentVersion,
        documentVersionId: body.documentVersionId,
        filePath: 'fakePath',
        creationDate: expect.any(Date),
        userId: userId2,
      });
    });

    it('Not created - Trying to create a version with same name', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocumentVersion)
        .expect(201);

      expect(body).toMatchObject({
        message: 'Document Version successfully created',
        documentVersionId: expect.any(Number),
      });

      await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocumentVersion)
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
        .send({
          name: 'some version',
          documentId: 9999,
        })
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
        .send(testDocumentVersion)
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
        .send(testDocumentVersion)
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

  describe('Delete', () => {
    let documentVersionId: number;

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/document-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocumentVersion)
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
});
