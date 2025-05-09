import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { DocumentLogEntity } from 'src/documents-log/entities/documents.log.entity';
import { RecycleBinEntity } from 'src/recycle-bin/entities/recycle.bin.entity';
import { VersionDocumentEntity } from 'src/version-documents/entities/version.document.entity';


/**
 * Represents a document entity in the database.
 */
@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  documentId: number;

  @Column()
  documentName: string;

  @Column()
  documentType: string;

  @Column()
  documentDescription: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  documentCreationDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  documentLastModifiedDate: Date;

  @ManyToOne(() => UserEntity, (user) => user.documents, { eager: true }) // eager: user entity will be loaded with the document
  @JoinColumn({ name: 'userId' }) // Foreign key column in the documents table
  owner: UserEntity;

  @OneToMany(() => DocumentLogEntity, (log) => log.document)
  documentLogs: DocumentLogEntity[];

  @OneToMany(() => RecycleBinEntity, (recycleBin) => recycleBin.document)
  recycleBins: RecycleBinEntity[];

  @OneToMany(() => VersionDocumentEntity, (versionDocument) => versionDocument.document)
  versionDocuments: VersionDocumentEntity[];

}

