import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersEntity } from './users.entity';
import { Repository } from 'typeorm';

export type User = {
  userId: number;
  username: string;
  password: string;
};

// FIXME: This is a mock database
/*
const users: User[] = [
  {
    userId: 1,
    username: 'john',
    password: 'changeme',
  },
  {
    userId: 2,
    username: 'chris',
    password: 'secret',
  },
];
*/

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly usersRepo: Repository<UsersEntity>,
  ) {}

  async findByUsername(username: string): Promise<User | undefined> {
    const user = await this.usersRepo.findOne({
      where: { username },
    });
    return user;
  }
}
