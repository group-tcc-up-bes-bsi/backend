import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Entity representing the structure of the user table in the database.
 */
@Entity('users')
export class UsersEntity {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;
}
