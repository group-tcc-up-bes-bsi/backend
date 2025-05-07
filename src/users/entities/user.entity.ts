import { DocumentEntity } from 'src/documents/entities/document.entity';
import { OrganizationEntity } from 'src/organizations/entities/organizations.entity';
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

  @Column({ unique: true })
  email: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => DocumentEntity, (document) => document.owner)
  documents: DocumentEntity[];

  @OneToMany(() => OrganizationEntity, (organization) => organization.owner)
  organizations: OrganizationEntity[];
}
