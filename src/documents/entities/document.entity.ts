import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { DocumentVersion } from 'src/document-versions/entities/document-version.entity';
import { UserFavoriteDoc } from 'src/users/entities/user-favorite-doc.entity';

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

  // Should be updated when a new version is added
  @Column({ default: 0 })
  activeVersionId: number;

  /* ------------- This document versions ------------- */
  @OneToMany(() => DocumentVersion, (version) => version.document)
  documentVersions: DocumentVersion[];

  /* ------------- From which organization is this document ------------- */
  @ManyToOne(() => Organization, (organization) => organization.documents)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  organizationId: number;

  /* ------------- Users who favorited this document ------------- */
  @OneToMany(() => UserFavoriteDoc, (favoriteDoc) => favoriteDoc.document)
  favoritedBy: UserFavoriteDoc[];
}
