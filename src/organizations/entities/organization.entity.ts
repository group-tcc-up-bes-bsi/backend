import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { OrganizationUserEntity } from 'src/organizations/entities/organization-user.entity';
import { DocumentEntity } from 'src/documents/entities/document.entity';

/**
 * Supported organization types
 * INDIVIDUAL - Single-owner org (e.g. freelancer, sole proprietor)
 * COLLABORATIVE - Multi-member org (e.g. company, team)
 */
export enum OrganizationType {
  INDIVIDUAL = 'Individual',
  COLLABORATIVE = 'Collaborative',
}

/**
 * Entity representing the structure of the organization table in the database.
 */
@Entity('organizations')
export class OrganizationEntity {
  @PrimaryGeneratedColumn()
  organizationId: number;

  @Column()
  organizationName: string;

  @Column()
  organizationDescription: string;

  @Column({ type: 'enum', enum: OrganizationType })
  organizationType: OrganizationType;

  @OneToMany(() => OrganizationUserEntity, (orgUser) => orgUser.organization)
  organizationUsers: OrganizationUserEntity[];

  @OneToMany(() => DocumentEntity, (document) => document.organization)
  documents: DocumentEntity[];
}
