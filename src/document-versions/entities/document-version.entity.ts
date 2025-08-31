import { Document } from 'src/documents/entities/document.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, RelationId } from 'typeorm';

/**
 * DocumentVersion entity.
 */
@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn()
  documentVersionId: number;

  @Column({ type: 'varchar', length: 100 })
  versionName: string;

  @Column({ type: 'varchar', length: 500 })
  versionFilePath: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  /* ------------- From which document is this version ------------- */
  @ManyToOne(() => Document, (document) => document.documentVersions)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @RelationId((version: DocumentVersion) => version.document)
  documentId: number;

  /* ------------- Who created this version ------------- */
  @ManyToOne(() => User, (user) => user.documentVersions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @RelationId((version: DocumentVersion) => version.user)
  userId: number;
}
