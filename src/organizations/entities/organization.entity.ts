import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { OrganizationUser } from 'src/organizations/entities/organization-user.entity';
import { Document } from 'src/documents/entities/document.entity';

/**
 * Supported organization types:
 * - INDIVIDUAL - Single user.
 * - COLLABORATIVE - Multiple users.
 */
export enum OrganizationType {
  INDIVIDUAL = 'individual',
  COLLABORATIVE = 'collaborative',
}

/**
 * Organization entity.
 */
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  organizationId: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ type: 'enum', enum: OrganizationType })
  organizationType: OrganizationType;

  /* ------------- The users of this organization ------------- */
  @OneToMany(() => OrganizationUser, (orgUser) => orgUser.organization)
  organizationUsers: OrganizationUser[];

  /* ------------- The documents of this organization ------------- */
  @OneToMany(() => Document, (document) => document.organization)
  documents: Document[];
}
