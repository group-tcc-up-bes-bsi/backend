import { DataSource, EntityTarget } from 'typeorm';
import { Document } from 'src/documents/entities/document.entity';
import { DocumentVersion } from 'src/document-versions/entities/document-version.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { OrganizationUser } from 'src/organizations/entities/organization-user.entity';
import { User } from 'src/users/entities/user.entity';

/**
 * FOR TESTING - Flush the database by clearing all data from the relevant tables.
 * @param {DataSource} db The Data source instance.
 */
export async function flushDatabase(db: DataSource) {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.getRepository(DocumentVersion).clear();
  await db.getRepository(Document).clear();
  await db.getRepository(OrganizationUser).clear();
  await db.getRepository(Organization).clear();
  await db.getRepository(User).clear();
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * FOR TESTING - Flush a specific database table.
 * @param {DataSource} db The Data source instance.
 * @param {Array<EntityTarget<any>>} entities The entities array to flush.
 */
export async function flushDatabaseTable(db: DataSource, entities: Array<EntityTarget<any>>) {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const entity of entities) {
    await db.getRepository(entity).clear();
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * FOR TESTING - Saves a test user to the database.
 * @param {DataSource} db The Data source instance.
 * @param {object} testUser The test user object to save.
 * @returns {Promise<number>} The ID of the saved user.
 */
export async function saveTestUser(db: DataSource, testUser: object) {
  const { userId } = await db.getRepository(User).save(testUser);
  return userId;
}
