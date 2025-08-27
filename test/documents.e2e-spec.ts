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
  email: 'test@example.com',
};

const testUser2 = {
  username: 'jane_doe',
  password: '123',
  email: 'jane@example.com',
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
  let userId: number;
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

    userId = await saveTestUser(db, testUser);
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

  describe.skip('Read - Get all my documents', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/documents').expect(401);
    });

    it('Get all documents', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testDocument)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          body.forEach((document) => {
            expect(document).toMatchObject({
              ...testDocument,
              documentId: expect.any(Number),
              documentCreationDate: expect.any(String),
              documentLastModifiedDate: expect.any(String),
              owner: userId,
            });
          });
          expect(body).toHaveLength(3);
        });
    });
  });

  describe('Read - Get one', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/documents/1').expect(401);
    });

    it('Get document by ID', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(201);

      const documentId = body.documentId;

      await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
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
        .get(`/documents/${documentId}`)
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
        .get(`/documents/${documentId}`)
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
        .get(`/documents/${documentId}`)
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
      return request(app.getHttpServer()).get('/documents/999').set('Authorization', `Bearer ${authToken}`).expect(404);
    });
  });

  describe.skip('Update', () => {
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

      const newDocument = {
        documentName: 'My Document',
        documentType: 'DOCX',
        documentDescription: 'My MS Word document',
      };

      await request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newDocument)
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Document successfully updated'));

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...newDocument,
        documentId,
        documentCreationDate: expect.any(Date),
        documentLastModifiedDate: expect.any(Date),
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
        .send({ documentName: 'updated document' })
        .expect(200)
        .expect(({ text }) => expect(text).toBe('Document successfully updated'));

      expect(await db.getRepository(Document).findOneBy({ documentId })).toMatchObject({
        ...testDocument,
        documentName: 'updated document',
        documentId,
        documentCreationDate: expect.any(Date),
        documentLastModifiedDate: expect.any(Date),
      });
    });

    it('Document not found', () => {
      return request(app.getHttpServer())
        .patch('/documents/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testDocument)
        .expect(404);
    });
  });

  describe.skip('Delete', () => {
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
        .expect(({ text }) => expect(text).toBe('Document successfully removed'));

      expect(await db.getRepository(Document).findOneBy({ documentId })).toBeNull();
    });

    it('Document not found', () => {
      return request(app.getHttpServer())
        .delete('/documents/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
