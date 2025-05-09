import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAllTables1746806002530 implements MigrationInterface {
    name = 'CreateAllTables1746806002530'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`organization_logs\` (\`logId\` int NOT NULL AUTO_INCREMENT, \`description\` varchar(255) NOT NULL, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`organizationOrganizationId\` int NULL, PRIMARY KEY (\`logId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`organizations\` (\`organizationId\` int NOT NULL AUTO_INCREMENT, \`organizationName\` varchar(255) NOT NULL, \`organizationDescription\` varchar(255) NOT NULL, \`organizationType\` enum ('Individual', 'Collaborative') NOT NULL, \`userId\` int NULL, PRIMARY KEY (\`organizationId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`document_logs\` (\`logId\` int NOT NULL AUTO_INCREMENT, \`description\` varchar(255) NOT NULL, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`documentDocumentId\` int NULL, \`userUserId\` int NULL, PRIMARY KEY (\`logId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`recycle_bins\` (\`recycleBinId\` int NOT NULL AUTO_INCREMENT, \`deletedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`reason\` varchar(255) NOT NULL, \`documentId\` int NULL, \`userId\` int NULL, PRIMARY KEY (\`recycleBinId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`documents\` (\`documentId\` int NOT NULL AUTO_INCREMENT, \`documentName\` varchar(255) NOT NULL, \`documentType\` varchar(255) NOT NULL, \`documentDescription\` varchar(255) NOT NULL, \`documentCreationDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`documentLastModifiedDate\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`userId\` int NULL, PRIMARY KEY (\`documentId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`version_documents\` (\`versionId\` int NOT NULL AUTO_INCREMENT, \`versionName\` varchar(255) NOT NULL, \`versionDescription\` varchar(255) NOT NULL, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`documentId\` int NULL, \`userId\` int NULL, PRIMARY KEY (\`versionId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`dashboards\` (\`dashboardId\` int NOT NULL AUTO_INCREMENT, \`organizations\` json NOT NULL, \`recentDocuments\` json NOT NULL, \`indicators\` json NOT NULL, PRIMARY KEY (\`dashboardId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`dataCriacao\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`status\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`userId\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`userId\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`)`);
        await queryRunner.query(`ALTER TABLE \`organization_logs\` ADD CONSTRAINT \`FK_8a3bf8baa301dede6354847935c\` FOREIGN KEY (\`organizationOrganizationId\`) REFERENCES \`organizations\`(\`organizationId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`organizations\` ADD CONSTRAINT \`FK_d2656076ffa800cd40418456b71\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`document_logs\` ADD CONSTRAINT \`FK_15db993895035d44aec58172a13\` FOREIGN KEY (\`documentDocumentId\`) REFERENCES \`documents\`(\`documentId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`document_logs\` ADD CONSTRAINT \`FK_522acb620c38411996d227d6f0b\` FOREIGN KEY (\`userUserId\`) REFERENCES \`users\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`recycle_bins\` ADD CONSTRAINT \`FK_db44f04c40def47ca2123ab70c1\` FOREIGN KEY (\`documentId\`) REFERENCES \`documents\`(\`documentId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`recycle_bins\` ADD CONSTRAINT \`FK_649f04f59f071d6169950e84643\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`documents\` ADD CONSTRAINT \`FK_e300b5c2e3fefa9d6f8a3f25975\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`version_documents\` ADD CONSTRAINT \`FK_aa49387a5bf5ec122a6419469bc\` FOREIGN KEY (\`documentId\`) REFERENCES \`documents\`(\`documentId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`version_documents\` ADD CONSTRAINT \`FK_fae9a9a163d06a3de6ef530960d\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`version_documents\` DROP FOREIGN KEY \`FK_fae9a9a163d06a3de6ef530960d\``);
        await queryRunner.query(`ALTER TABLE \`version_documents\` DROP FOREIGN KEY \`FK_aa49387a5bf5ec122a6419469bc\``);
        await queryRunner.query(`ALTER TABLE \`documents\` DROP FOREIGN KEY \`FK_e300b5c2e3fefa9d6f8a3f25975\``);
        await queryRunner.query(`ALTER TABLE \`recycle_bins\` DROP FOREIGN KEY \`FK_649f04f59f071d6169950e84643\``);
        await queryRunner.query(`ALTER TABLE \`recycle_bins\` DROP FOREIGN KEY \`FK_db44f04c40def47ca2123ab70c1\``);
        await queryRunner.query(`ALTER TABLE \`document_logs\` DROP FOREIGN KEY \`FK_522acb620c38411996d227d6f0b\``);
        await queryRunner.query(`ALTER TABLE \`document_logs\` DROP FOREIGN KEY \`FK_15db993895035d44aec58172a13\``);
        await queryRunner.query(`ALTER TABLE \`organizations\` DROP FOREIGN KEY \`FK_d2656076ffa800cd40418456b71\``);
        await queryRunner.query(`ALTER TABLE \`organization_logs\` DROP FOREIGN KEY \`FK_8a3bf8baa301dede6354847935c\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`userId\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`userId\` char(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD PRIMARY KEY (\`userId\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`status\` enum ('Ativo', 'Inativo') NOT NULL DEFAULT 'Ativo'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`dataCriacao\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`DROP TABLE \`dashboards\``);
        await queryRunner.query(`DROP TABLE \`version_documents\``);
        await queryRunner.query(`DROP TABLE \`documents\``);
        await queryRunner.query(`DROP TABLE \`recycle_bins\``);
        await queryRunner.query(`DROP TABLE \`document_logs\``);
        await queryRunner.query(`DROP TABLE \`organizations\``);
        await queryRunner.query(`DROP TABLE \`organization_logs\``);
    }

}
