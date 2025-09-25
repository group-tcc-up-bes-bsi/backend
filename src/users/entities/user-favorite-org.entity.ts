import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Organization } from 'src/organizations/entities/organization.entity';

/**
 * Entity representing a user's favorite organization.
 */
@Entity('user_favorite_orgs')
export class UserFavoriteOrg {
  @PrimaryGeneratedColumn()
  id: number;

  /* ----------------- User that marked as favorite ----------------- */
  @ManyToOne(() => User, (user) => user.favoriteOrgs, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  /* ----------------- Organization marked as favorite ----------------- */
  @ManyToOne(() => Organization, (organization) => organization.favoritedBy, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column()
  organizationId: number;
}
