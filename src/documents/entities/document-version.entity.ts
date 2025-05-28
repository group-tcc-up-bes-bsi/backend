import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DocumentEntity } from './document.entity';

/**
 * Represents a document version entity in the database.
 */
@Entity('document_versions')
export class DocumentVersionEntity {
  @PrimaryGeneratedColumn()
  documentVersionId: number;

  @Column()
  documentId: number;

  @Column()
  versionName: string;

  @Column()
  versionFilePath: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => DocumentEntity, (document) => document.versions)
  @JoinColumn({ name: 'documentId' })
  document: DocumentEntity;
}
