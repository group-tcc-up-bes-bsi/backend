import { Injectable } from '@nestjs/common';

export type User = {
  userId: number;
  username: string;
  password: string;
};

// FIXME: This is a mock database
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

@Injectable()
export class UsersService {
  async findByUsername(username: string): Promise<User | undefined> {
    return users.find((user) => user.username === username);
  }
}
