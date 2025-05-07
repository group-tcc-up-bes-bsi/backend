import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

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

  @ManyToOne(() => UserEntity, (user) => user.organizations, { eager: true }) // eager: user entity will be loaded with the document
  @JoinColumn({ name: 'userId' }) // Foreign key column in the organizations table
  owner: UserEntity;
}
