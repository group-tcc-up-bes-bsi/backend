import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { DocumentEntity } from 'src/documents/entities/document.entity';
import { OrganizationUserEntity } from 'src/organizations/entities/organization-user.entity';
import { OrganizationEntity } from 'src/organizations/entities/organization.entity';

describe('Documents Controller (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let authToken: string;
  let userId: number;

  const testDocument = {
    documentName: 'test document',
    documentType: 'PDF',
    documentDescription: 'some test document',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);

    await db.getRepository(OrganizationUserEntity).delete({});
    await db.getRepository(OrganizationEntity).delete({});
    await db.getRepository(UserEntity).delete({});
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
  });

  beforeEach(async () => {
    await db.getRepository(DocumentEntity).delete({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .send(testDocument)
        .expect(401);
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
        await db
          .getRepository(DocumentEntity)
          .findOneBy({ documentId: body.documentId }),
      ).toMatchObject({
        ...testDocument,
        documentId: body.documentId,
        documentCreationDate: expect.any(Date),
        documentLastModifiedDate: expect.any(Date),
        owner: {
          userId,
          username: 'john_doe',
          password: '123',
          email: 'test@example.com',
        },
      });
    });

    it('Missing fields', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(body).toMatchObject({
        message: [
          'documentName must be a string',
          'documentType must be a string',
          'documentDescription must be a string',
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
      return request(app.getHttpServer())
        .get('/documents/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
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
      return request(app.getHttpServer())
        .patch('/documents/1')
        .send(testDocument)
        .expect(401);
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
        .expect(({ text }) =>
          expect(text).toBe('Document successfully updated'),
        );

      expect(
        await db.getRepository(DocumentEntity).findOneBy({ documentId }),
      ).toMatchObject({
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
        .expect(({ text }) =>
          expect(text).toBe('Document successfully updated'),
        );

      expect(
        await db.getRepository(DocumentEntity).findOneBy({ documentId }),
      ).toMatchObject({
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
      return request(app.getHttpServer())
        .delete('/documents/1')
        .send(testDocument)
        .expect(401);
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
        .expect(({ text }) =>
          expect(text).toBe('Document successfully removed'),
        );

      expect(
        await db.getRepository(DocumentEntity).findOneBy({ documentId }),
      ).toBeNull();
    });

    it('Document not found', () => {
      return request(app.getHttpServer())
        .delete('/documents/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
