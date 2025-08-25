import { DocumentEntity } from 'src/documents/entities/document.entity';
import { OrganizationUserEntity } from 'src/organizations/entities/organization-user.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

/**
 * Represents a user entity in the database.
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // TODO: Check cascade options for FK's

  @OneToMany(() => DocumentEntity, (document) => document.owner)
  documents: DocumentEntity[];

  @OneToMany(() => OrganizationUserEntity, (organizationUser) => organizationUser.user)
  organizations: OrganizationUserEntity[];
}
