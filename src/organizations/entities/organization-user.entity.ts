import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
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
  WRITE = 'write',
  READ = 'read',
}

/**
 * Entity representing the structure of the organizations-users table in the database.
 */
@Entity('organization_users')
export class OrganizationUserEntity {
  @PrimaryGeneratedColumn()
  organizationUserId: number;

  @Column() // Foreign Key
  userId: number;

  @ManyToOne(() => UserEntity, (user) => user.organizations)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column() // Foreign Key
  organizationId: number;

  @ManyToOne(() => OrganizationEntity, (org) => org.organizationUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column({ type: 'enum', enum: UserType })
  userType: UserType;

  @Column()
  inviteAccepted: boolean;
}
