import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { OrganizationEntity } from 'src/organizations/entities/organization.entity';
import { DocumentVersionEntity } from './document-version.entity';

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

  // Should be updated when a new version is added
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  documentLastModifiedDate: Date;

  // Id of the active version of the document
  @Column({ nullable: true })
  documentActiveVersionId: number;

  @Column() // Foreign Key
  organizationId: number;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.documents)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @OneToMany(() => DocumentVersionEntity, (version) => version.document)
  versions: DocumentVersionEntity[];
}
