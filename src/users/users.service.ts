import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type User = {
  userId: number;
  username: string;
  password: string;
};

/**
 * Service for managing users.
 * This service interacts with the database to perform CRUD operations on user entities.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  /**
   * Creates an instance of UsersService.
   * @param {Repository<UserEntity>} usersRepo - The repository for user entities.
   */
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

  /**
   * Finds a user by their username.
   * @param {string} username - The username of the user to find.
   * @returns {Promise<User | undefined>} - A promise that resolves to the user object if found, or undefined if not found.
   */
  async findByUsername(username: string): Promise<User | undefined> {
    const user = await this.usersRepo.findOne({
      where: { username },
    });
    if (user == null) {
      this.logger.warn(`User with username ${username} not found`);
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Retrieves all users.
   * @returns {Promise<UserEntity[]>} - A promise that resolves to an array of user entities.
   */
  findAll() {
    return this.usersRepo.find();
  }

  /**
   * Retrieves a user by their ID.
   * @param {number} userId - The ID of the user to retrieve.
   * @returns {Promise<UserEntity>} - A promise that resolves to the user entity if found.
   */
  async findOne(userId: number) {
    const user = await this.usersRepo.findOneBy({ userId });
    if (user) {
      return user;
    }
    this.logger.warn(`User with ID ${userId} not found`);
    throw new NotFoundException('User not found');
  }

  /**
   * Creates a new user.
   * @param {CreateUserDto} dto - The data transfer object containing user information.
   * @returns {Promise<UserEntity>} - A promise that resolves to the created user entity.
   * @throws {ConflictException} - If a user with the same username already exists.
   */
  async create(dto: CreateUserDto): Promise<UserEntity> {
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

  /**
   * Updates an existing user.
   * @param {number} userId - The ID of the user to update.
   * @param {UpdateUserDto} dto - The data transfer object containing updated user information.
   * @returns {Promise<UserEntity>} - A promise that resolves to the updated user entity.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the user with the specified ID does not exist.
   * @throws {ConflictException} - If a user with the same username already exists.
   */
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
        } else {
          this.logger.error(`Unexpected error: ${e.message}`);
          throw new Error('Unexpected error');
        }
      }

      this.logger.error(`Error updating user with ID ${userId}`, e.stack);
      throw new Error('Error updating user');
    }
  }

  /**
   * Removes a user by their ID.
   * @param {number} userId - The ID of the user to remove.
   * @returns {Promise<UserEntity>} - A promise that resolves to the removed user entity.
   * @throws {NotFoundException} - If the user with the specified ID does not exist.
   */
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
