import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersEntity } from './entity/users.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type User = {
  userId: number;
  username: string;
  password: string;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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

  findAll() {
    return this.usersRepo.find();
  }

  findOne(userId: number) {
    return this.usersRepo.findOneBy({ userId });
  }

  async create(dto: CreateUserDto): Promise<UsersEntity> {
    const user = this.usersRepo.create(dto);
    try {
      const savedUser = await this.usersRepo.save(user);
      this.logger.log(
        `User ${savedUser.username} successfully created with ID ${savedUser.userId}`,
      );
      return savedUser;
    } catch (e) {
      if (e.sqlMessage.includes('Duplicate entry')) {
        this.logger.warn(`User with username ${dto.username} already exists`);
        throw new ConflictException('User already exists');
      }
      this.logger.error('Error creating user', e.stack);
      throw new Error('Error creating user');
    }
  }

  async update(userId: number, dto: UpdateUserDto) {
    try {
      const result = await this.usersRepo.update(userId, dto);
      if (result.affected > 0) {
        this.logger.log(`User with ID ${userId} successfully updated`);
        return this.findOne(userId);
      } else {
        this.logger.warn(`No user found with ID ${userId} to update`);
        return null;
      }
    } catch (e) {
      this.logger.error(`Error updating user with ID ${userId}`, e.stack);
      throw e;
    }
  }

  async remove(userId: number) {
    const user = await this.findOne(userId);
    if (user) {
      try {
        await this.usersRepo.remove(user);
        this.logger.log(`User with ID ${userId} successfully removed`);
        return user;
      } catch (e) {
        this.logger.error(`Error removing user with ID ${userId}`, e.stack);
        throw e;
      }
    } else {
      this.logger.warn(`User with ID ${userId} not found for removal`);
      return null;
    }
  }
}
