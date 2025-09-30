import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  DeleteDateColumn,
} from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { DocumentVersion } from 'src/document-versions/entities/document-version.entity';
import { User } from 'src/users/entities/user.entity';

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

  // Updated when the document is moved to the trash or restored
  @DeleteDateColumn()
  deletedAt?: Date;

  /* ------------- This document versions ------------- */
  @OneToMany(() => DocumentVersion, (version) => version.document)
  documentVersions: DocumentVersion[];

  /* ------------- From which organization is this document ------------- */
  @ManyToOne(() => Organization, (organization) => organization.documents)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  organizationId: number;

  /* ------------- Favorited By Users ------------- */
  @ManyToMany(() => User, (user) => user.favoriteDocuments)
  favoritedByUsers: User[];
}
