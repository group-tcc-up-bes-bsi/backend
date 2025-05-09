import { DocumentEntity } from 'src/documents/entities/document.entity';
import { OrganizationEntity } from 'src/organizations/entities/organizations.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DocumentLogEntity } from 'src/documents-log/entities/documents.log.entity'; // ajuste o caminho conforme sua estrutura
import { RecycleBinEntity } from 'src/recycle-bin/entities/recycle.bin.entity';
import { VersionDocumentEntity } from 'src/version-documents/entities/version.document.entity';

/*
 * Represents a user entity in the database.
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => DocumentEntity, (document) => document.owner)
  documents: DocumentEntity[];

  @OneToMany(() => OrganizationEntity, (organization) => organization.owner)
  organizations: OrganizationEntity[];

  @OneToMany(() => DocumentLogEntity, (log) => log.user)
  documentLogs: DocumentLogEntity[];

  @OneToMany(() => RecycleBinEntity, (recycleBin) => recycleBin.user)
  recycleBins: RecycleBinEntity[];

  @OneToMany(() => VersionDocumentEntity, (versionDocument) => versionDocument.user)
  versionDocuments: VersionDocumentEntity[];

}
