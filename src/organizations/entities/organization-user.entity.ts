import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Organization } from 'src/organizations/entities/organization.entity';

/**
 * Supported User types:
 * - OWNER - Organization administrator.
 * - WRITE - Creation and update access.
 * - READ - Read-only access.
 */
export enum UserType {
  OWNER = 'owner',
  WRITE = 'write',
  READ = 'read',
}

/**
 * OrganizationUser entity.
 */
@Entity('organization_users')
export class OrganizationUser {
  @PrimaryGeneratedColumn()
  organizationUserId: number;

  @Column()
  inviteAccepted: boolean;

  @Column({ type: 'enum', enum: UserType })
  userType: UserType;

  /* ------------- The user ------------- */
  @ManyToOne(() => User, (user) => user.organizations)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  /* ------------- The organization that the user is part of ------------- */
  @ManyToOne(() => Organization, (org) => org.organizationUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  organizationId: number;
}
