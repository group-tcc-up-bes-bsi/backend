import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersEntity } from './entity/users.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type User = {
  email: string;
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

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersRepo.findOne({
      where: { email },
    });
    return user;
  }

  findAll() {
    return this.usersRepo.find();
  }

  async findOne(userId: number) {
    const user = await this.usersRepo.findOneBy({ userId });
    if (user) {
      return user;
    }
    this.logger.warn(`User with ID ${userId} not found`);
    throw new NotFoundException('User not found');
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
    if (Object.keys(dto).length === 0) {
      this.logger.warn(`No data provided for update userId ${userId}`);
      throw new BadRequestException('No data provided for update');
    }

    try {
      const result = await this.usersRepo.update(userId, dto);
      if (result.affected > 0) {
        this.logger.log(`User with ID ${userId} successfully updated`);
        const updatedUser = await this.findOne(userId);
        return {
          userId: updatedUser.userId,
          username: updatedUser.username,
          email: updatedUser.email,
        };
      } else {
        this.logger.warn(`No user found with ID ${userId} to update`);
        throw new NotFoundException('User not found');
      }
    } catch (e) {
      if (e.name === 'NotFoundException') {
        throw e;
      }

      if (e.sqlMessage.includes('Duplicate entry')) {
        if (e.query.includes('username')) {
          this.logger.warn(`User with username ${dto.username} already exists`);
          throw new ConflictException('User already exists');
        } else if (e.query.includes('email')) {
          this.logger.warn(`User with email ${dto.email} already exists`);
          throw new ConflictException('Email already exists');
        } else {
          this.logger.error(`Unexpected error: ${e.message}`);
          throw new Error('Unexpected error');
        }
      }

      this.logger.error(`Error updating user with ID ${userId}`, e.stack);
      throw new Error('Error updating user');
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
        throw new Error('Error deleting user');
      }
    } else {
      this.logger.warn(`User with ID ${userId} not found for removal`);
      throw new NotFoundException('User not found');
    }
  }
}
