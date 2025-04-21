import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class UsersEntity {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column()
  email: string;
}
