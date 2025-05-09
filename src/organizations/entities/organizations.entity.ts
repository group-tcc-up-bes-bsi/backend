import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationLogEntity } from 'src/organization-log/entities/organization.log.entity';

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

  @ManyToOne(() => UserEntity, (user) => user.organizations, { eager: true })
  @JoinColumn({ name: 'userId' })
  owner: UserEntity;

  @OneToMany(() => OrganizationLogEntity, (log) => log.organization)
  logs: OrganizationLogEntity[];
}

