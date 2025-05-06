import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  OrganizationEntity,
  OrganizationType,
} from 'src/organizations/entities/organizations.entity';

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let authToken: string;
  let userId: number;

  const organization = {
    organizationName: 'Test Org',
    organizationDescription: 'Test Description',
    organizationType: OrganizationType.INDIVIDUAL,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DataSource);

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
    await db.getRepository(OrganizationEntity).delete({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .post('/organizations')
        .send(organization)
        .expect(401);
    });

    it('Organization created successfully', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organization)
        .expect(201);

      expect(body).toMatchObject({
        message: 'Organization successfully created',
        organizationId: expect.any(Number),
      });

      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId: body.organizationId }),
      ).toMatchObject({
        ...organization,
        organizationId: body.organizationId,
        organizationName: expect.any(String),
        organizationDescription: expect.any(String),
        organizationType: OrganizationType.INDIVIDUAL,
      });
    });
    it('Missing fields', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(body).toMatchObject({
        message: [
          'organizationName must be a string',
          'organizationDescription must be a string',
          'organizationType must be one of the following values: Individual, Collaborative',
        ],
      });
    });
  });

  describe('Read - Get all', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/organizations').expect(401);
    });

    it('Get all organizations', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/organizations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(organization)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          body.forEach((organization) => {
            expect(organization).toMatchObject({
              ...organization,
              organizationId: expect.any(Number),
              organizationName: expect.any(String),
              organizationDescription: expect.any(String),
              organizationType: OrganizationType.INDIVIDUAL,
              owner: userId,
            });
          });
          expect(body).toHaveLength(3);
        });
    });
  });

  describe('Read - Get one', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer()).get('/organizations/1').expect(401);
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .get('/organizations/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('Get organization by ID', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organization)
        .expect(201);

      const organizationId = body.organizationId;

      await request(app.getHttpServer())
        .get(`/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            ...organization,
            organizationId,
            organizationName: expect.any(String),
            organizationDescription: expect.any(String),
            organizationType: OrganizationType.INDIVIDUAL,
            owner: userId,
          });
        });
    });
  });

  describe('Update', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/1`)
        .send(organization)
        .expect(401);
    });

    it('Organization updated successfully', async () => {
      const organizationId = (
        await request(app.getHttpServer())
          .post(`/organizations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(organization)
          .expect(201)
      ).body.organizationId;

      const newOrganization = {
        organizationName: 'My organization',
        organizationDescription: 'Test Description',
        organizationType: OrganizationType.INDIVIDUAL,
      };

      await request(app.getHttpServer())
        .patch(`/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrganization)
        .expect(200)
        .expect(({ text }) =>
          expect(text).toBe('Organization successfully updated'),
        );
      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId }),
      ).toMatchObject({
        ...newOrganization,
        organizationId,
        organizationName: expect.any(String),
        organizationDescription: expect.any(String),
      });
    });

    it('Organization updated successfully - Only 1 param', async () => {
      const organizationId = (
        await request(app.getHttpServer())
          .post(`/organizations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(organization)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .patch(`/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationName: 'updated organization' })
        .expect(200)
        .expect(({ text }) =>
          expect(text).toBe('Organization successfully updated'),
        );

      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId }),
      ).toMatchObject({
        ...organization,
        organizationName: 'updated organization',
        organizationId,
        organizationDescription: expect.any(String),
        organizationType: OrganizationType.INDIVIDUAL,
      });
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .patch('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organization)
        .expect(404);
    });

    it('Invalid organization type', () => {
      return request(app.getHttpServer())
        .patch(`/organizations/1`)
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

  describe('Delete', () => {
    it('Request without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/organizations/1`)
        .set(organization)
        .expect(401);
    });

    it('Organization deleted successfully', async () => {
      const organizationId = (
        await request(app.getHttpServer())
          .post(`/organizations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(organization)
          .expect(201)
      ).body.organizationId;

      await request(app.getHttpServer())
        .delete(`/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ organizationName: 'updated organization' })
        .expect(200)
        .expect(({ text }) =>
          expect(text).toBe('Organization sucessfully removed'),
        );
      expect(
        await db
          .getRepository(OrganizationEntity)
          .findOneBy({ organizationId }),
      ).toBeNull();
    });

    it('Organization not found', () => {
      return request(app.getHttpServer())
        .delete('/organizations/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
