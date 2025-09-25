import { DocumentVersion } from 'src/document-versions/entities/document-version.entity';
import { OrganizationUser } from 'src/organizations/entities/organization-user.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserFavoriteOrg } from './user-favorite-org.entity';
import { UserFavoriteDoc } from './user-favorite-doc.entity';

/**
 * User entity.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  /* ------------- From which organizations this user is part of ------------- */
  @OneToMany(() => OrganizationUser, (organizationUser) => organizationUser.user)
  organizations: OrganizationUser[];

  /* ------------- Document versions created by this user ------------- */
  @OneToMany(() => DocumentVersion, (documentVersion) => documentVersion.user)
  documentVersions: DocumentVersion[];

  /* ------------- Organizations marked as favorite by this user ------------- */
  @OneToMany(() => UserFavoriteOrg, (favoriteOrg) => favoriteOrg.user)
  favoriteOrgs: UserFavoriteOrg[];

  /* ------------- Documents marked as favorite by this user ------------- */
  @OneToMany(() => UserFavoriteDoc, (favoriteDoc) => favoriteDoc.user)
  favoriteDocs: UserFavoriteOrg[];
}
