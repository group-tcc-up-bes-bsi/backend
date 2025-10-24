import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { UpdateUserPasswordDto } from './dto/update-user-password';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { DocumentsService } from 'src/documents/documents.service';
import { UserType } from 'src/organizations/entities/organization-user.entity';

/**
 * Service for managing users.
 * This service interacts with the database to perform CRUD operations on user entities.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  adminPassword: string;

  /**
   * Creates an instance of UsersService.
   * @param {Repository<User>} usersRepo - The repository for user entities.
   * @param {OrganizationsService} organizationsService - The service for managing organizations.
   * @param {DocumentsService} documentsService - The service for managing documents.
   * @param {ConfigService} configService - The configuration service to access environment variables.
   */
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private organizationsService: OrganizationsService,
    private documentsService: DocumentsService,
    private readonly configService: ConfigService,
  ) {
    this.adminPassword = configService.get('ADMINPASS');
  }

  /**
   * Finds a user by their username for authentication purposes.
   * @param {string} username - The username of the user to find.
   * @returns {Promise<User | undefined>} - A promise that resolves to the user object if found, or undefined if not found.
   */
  findAuthUser(username: string): Promise<User | undefined> {
    return this.usersRepo.findOne({
      where: { username },
    });
  }

  /**
   * Finds a user by their username.
   * @param {string} username - The username of the user to find.
   * @returns {Promise<object>} - A promise that resolves to the user object if found, or undefined if not found.
   */
  async findByUsername(username: string): Promise<object> {
    const user = await this.usersRepo.findOne({
      where: { username },
    });
    if (!user) {
      throw new NotFoundException('User with this username not found');
    }
    return {
      userId: user.userId,
      username: user.username,
    };
  }

  /**
   * Finds a username by user ID.
   * @param {number} userId - The ID of the user.
   * @returns {Promise<string>} - A promise that resolves to the username if found.
   */
  async findUsernameById(userId: number): Promise<object> {
    const user = await this.usersRepo.findOne({
      where: { userId },
    });
    if (!user) {
      throw new NotFoundException('User with this username not found');
    }
    return { userId, username: user.username };
  }

  /**
   * Retrieves a user by their ID.
   * @param {number} userId - The ID of the user to retrieve.
   * @returns {Promise<User>} - A promise that resolves to the user entity if found.
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
   * @returns {Promise<object>} - A promise that is resolved when the user is created.
   * @throws {ConflictException} - If a user with the same username already exists.
   */
  async create(dto: CreateUserDto): Promise<object> {
    return this.usersRepo
      .save(this.usersRepo.create(dto))
      .then((savedUser) => {
        this.logger.log(`User ${savedUser.username} successfully created with ID ${savedUser.userId}`);
        return {
          userId: savedUser.userId,
          message: 'User created successfully',
        };
      })
      .catch((e) => {
        if (e.sqlMessage.includes('Duplicate entry')) {
          this.logger.warn(`User with username ${dto.username} already exists`);
          throw new ConflictException('User already exists');
        }
        this.logger.error('Error creating user', e.stack);
        throw new Error('Error creating user');
      });
  }

  /**
   * Updates an existing user.
   * @param {number} userId - The ID of the user to update.
   * @param {UpdateUserDto} dto - The data transfer object containing updated user information.
   * @returns {Promise<any>} - A promise that is resolved when the operation is completed.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the user with the specified ID does not exist.
   * @throws {ConflictException} - If a user with the same username already exists.
   */
  async update(userId: number, dto: UpdateUserDto) {
    if (Object.keys(dto).length === 0) {
      this.logger.warn(`No data provided for update userId ${userId}`);
      throw new BadRequestException('No data provided for update');
    }

    return this.usersRepo
      .update(userId, dto)
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(`User with ID ${userId} successfully updated`);
          return {
            message: 'User successfully updated',
            userId,
          };
        } else {
          this.logger.warn(`No user found with ID ${userId} to update`);
          throw new NotFoundException('User not found');
        }
      })
      .catch((e) => {
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
      });
  }

  /**
   * Updates an existing user.
   * @param {UpdateUserDto} dto - The data transfer object containing updated user information.
   * @returns {Promise<object>} - A promise that resolves to the updated user entity.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the user with the specified ID does not exist.
   * @throws {ConflictException} - If a user with the same username already exists.
   */
  async updatePassword(dto: UpdateUserPasswordDto) {
    const { adminPass, username, password } = dto;
    if (!adminPass) {
      this.logger.warn(`No AdminPass provided for update userId ${username}`);
      throw new BadRequestException('No AdminPass provided for update');
    }

    if (adminPass !== this.adminPassword) {
      this.logger.warn(`AdminPass is incorrect for update user ${username}`);
      throw new ForbiddenException('Invalid AdminPass');
    }

    const user = await this.findAuthUser(username);
    if (!user) {
      this.logger.warn(`User with ID ${username} not found for password update`);
      throw new NotFoundException('User not found');
    }

    const { userId } = user;

    return this.usersRepo
      .update(userId, {
        ...user,
        password,
      })
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(`User with ID ${userId} password successfully updated`);
          return {
            message: 'User password successfully updated',
            userId,
          };
        } else {
          this.logger.warn(`No user found with ID ${userId} to update`);
          throw new NotFoundException('User not found');
        }
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(`Error updating user with ID ${userId}`, e.stack);
        throw new Error('Error updating user');
      });
  }

  /**
   * Removes a user by their ID.
   * @param {number} userId - The ID of the user to remove.
   * @returns {Promise<any>} - A promise that resolves when the operation is completed.
   * @throws {NotFoundException} - If the user with the specified ID does not exist.
   */
  async remove(userId: number) {
    const user = await this.findOne(userId);
    if (user) {
      return this.usersRepo
        .remove(user)
        .then(() => {
          this.logger.log(`User with ID ${userId} successfully removed`);
          return {
            message: 'User successfully deleted',
            userId,
          };
        })
        .catch((e) => {
          this.logger.error(`Error removing user with ID ${userId}`, e.stack);
          throw new Error('Error deleting user');
        });
    } else {
      this.logger.warn(`User with ID ${userId} not found for removal`);
      throw new NotFoundException('User not found');
    }
  }

  //////////////////////////////////////////////////////////////////////
  // Favorites methods
  ///////////////////////////////////////////////////////////////////////

  /**
   * Adds an organization to the user's list of favorite organizations.
   * @param {number} userId - The ID of the user.
   * @param {number} organizationId - The ID of the organization to add to favorites.
   * @returns {Promise<object>} - A promise that resolves when the operation is completed.
   */
  async addFavoriteOrganization(userId: number, organizationId: number): Promise<object> {
    const user = await this.usersRepo.findOne({
      where: { userId },
      relations: ['favoriteOrganizations'],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const organization = await this.organizationsService.findOneOrganization(organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    const alreadyFavorite = user.favoriteOrganizations.some((org) => org.organizationId === organizationId);
    if (alreadyFavorite) {
      throw new ConflictException('Organization already in favorites');
    }

    await this.organizationsService.checkUserRole(userId, organizationId, [
      UserType.OWNER,
      UserType.WRITE,
      UserType.READ,
    ]);

    user.favoriteOrganizations.push(organization);
    await this.usersRepo.save(user);

    this.logger.debug(`Organization ${organizationId} added to favorites of user ${userId}`);

    return { message: 'Organization added to favorites', organizationId };
  }

  /**
   * Removes an organization from the user's list of favorite organizations.
   * @param {number} userId - The ID of the user.
   * @param {number} organizationId - The ID of the organization to remove from favorites.
   * @returns {Promise<object>} - A promise that resolves when the operation is completed.
   */
  async removeFavoriteOrganization(userId: number, organizationId: number): Promise<object> {
    const user = await this.usersRepo.findOne({
      where: { userId },
      relations: ['favoriteOrganizations'],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const beforeCount = user.favoriteOrganizations.length;
    user.favoriteOrganizations = user.favoriteOrganizations.filter((org) => org.organizationId !== organizationId);

    if (beforeCount === user.favoriteOrganizations.length) {
      throw new NotFoundException(`Organization ${organizationId} not in favorites`);
    }

    await this.usersRepo.save(user);

    this.logger.debug(`Organization ${organizationId} removed from favorites of user ${userId}`);

    return { message: 'Organization removed from favorites', organizationId };
  }

  /**
   * Retrieves the list of favorite organizations for a user.
   * @param {number} userId - The ID of the user.
   * @returns {Promise<any[]>} - A promise that resolves to an array of favorite organizations.
   */
  async getFavoriteOrganizations(userId: number): Promise<any[]> {
    const user = await this.usersRepo.findOne({
      where: { userId },
      relations: ['favoriteOrganizations'],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user.favoriteOrganizations;
  }

  /**
   * Adds a document to the user's list of favorite documents.
   * @param {number} userId - The ID of the user.
   * @param {number} documentId - The ID of the document to add to favorites.
   * @returns {Promise<object>} - A promise that resolves when the operation is completed.
   */
  async addFavoriteDocument(userId: number, documentId: number): Promise<object> {
    const user = await this.usersRepo.findOne({
      where: { userId },
      relations: ['favoriteDocuments'],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const document = await this.documentsService.findOne(userId, documentId);
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    const alreadyFavorite = user.favoriteDocuments.some((doc) => doc.documentId === documentId);
    if (alreadyFavorite) {
      throw new ConflictException('Document already in favorites');
    }

    user.favoriteDocuments.push(document);
    await this.usersRepo.save(user);

    this.logger.debug(`Document ${documentId} added to favorites of user ${userId}`);

    return { message: 'Document added to favorites', documentId };
  }

  /**
   * Removes a document from the user's list of favorite documents.
   * @param {number} userId - The ID of the user.
   * @param {number} documentId - The ID of the document to remove from favorites.
   * @returns {Promise<object>} - A promise that resolves when the operation is completed.
   */
  async removeFavoriteDocument(userId: number, documentId: number): Promise<object> {
    const user = await this.usersRepo.findOne({
      where: { userId },
      relations: ['favoriteDocuments'],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const beforeCount = user.favoriteDocuments.length;
    user.favoriteDocuments = user.favoriteDocuments.filter((doc) => doc.documentId !== documentId);

    if (beforeCount === user.favoriteDocuments.length) {
      throw new NotFoundException(`Document ${documentId} not in favorites`);
    }

    await this.usersRepo.save(user);

    this.logger.debug(`Document ${documentId} removed from favorites of user ${userId}`);

    return { message: 'Document removed from favorites', documentId };
  }

  /**
   * Retrieves the list of favorite documents for a user.
   * @param {number} userId - The ID of the user.
   * @returns {Promise<any[]>} - A promise that resolves to an array of favorite documents.
   */
  async getFavoriteDocuments(userId: number): Promise<any[]> {
    const user = await this.usersRepo.findOne({
      where: { userId },
      relations: ['favoriteDocuments'],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user.favoriteDocuments;
  }
}
