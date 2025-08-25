import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { Document } from 'src/documents/entities/document.entity';
import { flushDatabase, flushDatabaseTable, saveTestUser } from './helpers/database-utils';
import { createTestOrganization, makeTestLogin } from './helpers/endpoint-utils';
import { OrganizationType } from 'src/organizations/entities/organization.entity';

//////////////////////////////////////////////////////////////////////
// Test entity objects
///////////////////////////////////////////////////////////////////////

const testUser = {
  username: 'john_doe',
  password: '123',
  email: 'test@example.com',
};

const testOrganization = {
  name: 'Test Org',
  description: 'Test Description',
  organizationType: OrganizationType.INDIVIDUAL,
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
  let authToken: string;
  let userId: number;

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
    testDocument.organizationId = await createTestOrganization(app, authToken, testOrganization);
  });

  beforeEach(async () => {
    await flushDatabaseTable(db, [Document]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe.only('Create', () => {
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

  describe('Read - Get all', () => {
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

    it('Document not found', () => {
      return request(app.getHttpServer()).get('/documents/999').set('Authorization', `Bearer ${authToken}`).expect(404);
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
            documentCreationDate: expect.any(String),
            documentLastModifiedDate: expect.any(String),
            owner: userId,
          });
        });
    });
  });

  describe('Update', () => {
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
