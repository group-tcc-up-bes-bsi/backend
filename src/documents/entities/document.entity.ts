import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, RelationId } from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { DocumentVersion } from 'src/document-versions/entities/document-version.entity';

/**
 * Document entity.
 */
@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  documentId: number;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column()
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  creationDate: Date;

  // Should be updated when a new version is added
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastModifiedDate: Date;

  /* ------------- This document versions ------------- */
  @OneToMany(() => DocumentVersion, (version) => version.document)
  documentVersions: DocumentVersion[];

  /* ------------- From which organization is this document ------------- */
  @ManyToOne(() => Organization, (organization) => organization.documents)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @RelationId((document: Document) => document.organization)
  organizationId: number;
}
