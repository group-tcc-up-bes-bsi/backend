import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Document } from 'src/documents/entities/document.entity';

/**
 * Entity representing a user's favorite document.
 */
@Entity('user_favorite_docs')
export class UserFavoriteDoc {
  @PrimaryGeneratedColumn()
  id: number;

  /* ----------------- User that marked as favorite ----------------- */
  @ManyToOne(() => User, (user) => user.favoriteDocs, { onDelete: 'CASCADE' })
  user: User;

  userId: number;

  /* ----------------- Document marked as favorite ----------------- */
  @ManyToOne(() => Document, (document) => document.favoritedBy, { onDelete: 'CASCADE' })
  document: Document;

  documentId: number;
}
