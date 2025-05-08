import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationEntity } from 'src/organizations/entities/organization.entity';

/**
 * Supported User types / Tipos de usuários suportados
 * OWNER - System administrator with full permissions / Administrador do sistema com permissões totais
 * READ - Editor with read and write access / Editor com acesso de leitura e escrita
 * VIEWER - Read-only access / Acesso somente leitura
 */
export enum UserType {
  OWNER = 'owner',
  READ = 'read',
  VIEWER = 'viewer',
}

/**
 * Entity representing the structure of the organizations-users table in the database.
 */
@Entity('organizationUsers')
export class OrganizationUserEntity {
  @PrimaryGeneratedColumn()
  organizationUserId: number;

  @ManyToOne(() => UserEntity, (user) => user.organizationUsers, {
    eager: true,
  }) // eager: user entity will be loaded with the document
  @JoinColumn({ name: 'userId' }) // Foreign key column in the organization-users table
  user: UserEntity;

  @ManyToOne(
    () => OrganizationEntity,
    (organization) => organization.organizationUsers,
    { eager: true },
  ) // eager: user entity will be loaded with the document
  @JoinColumn({ name: 'organizationId' }) // Foreign key column in the organization-users table
  organization: OrganizationEntity;

  @Column({ type: 'enum', enum: UserType })
  userType: UserType;

  @Column()
  inviteAccepted: boolean;
}
