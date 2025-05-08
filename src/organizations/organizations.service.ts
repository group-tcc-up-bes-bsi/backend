import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationEntity } from './entities/organization.entity';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UsersService } from 'src/users/users.service';
import { CreateOrganizationUserDto } from './dto/create-organization-user.dto';
import { OrganizationUserEntity } from './entities/organization-user.entity';
import { UpdateOrganizationUserDto } from './dto/update-organization-user.dto';

/**
 * Service for managing organizations.
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  /**
   * Creates an instance of OrganizationsService.
   * @param {Repository<OrganizationEntity>} organizationsRepo - The repository for organization entities.
   * @param {Repository<OrganizationUserEntity>} organizationUserRepo - The repository for organization user entities.
   * @param {UsersService} usersService - The service for managing users.
   */
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationsRepo: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationUserEntity)
    private readonly organizationUserRepo: Repository<OrganizationUserEntity>,
    private usersService: UsersService,
  ) {}

  /**
   * Creates a new organization.
   * @param {CreateOrganizationDto} createOrganizationDto - The data transfer object containing organization information.
   * @returns {object} - Object containing message and organizationId.
   * @throws {NotFoundException} - If the user is not found.
   * @throws {Error} - If an error occurs during the save process.
   */
  async create(createOrganizationDto: CreateOrganizationDto) {
    const { userCreatedId, ...rest } = createOrganizationDto;

    const user = await this.usersService.findOne(userCreatedId);

    if (!user) {
      this.logger.error(`User with ID ${userCreatedId} was not found.`);
      return new NotFoundException(`User was not found`);
    }

    return this.organizationsRepo
      .save(this.organizationsRepo.create({ ...rest, owner: user }))
      .then(({ organizationId }) => {
        this.logger.log(`Organization Id ${organizationId} seved sucessfully`);
        return {
          message: 'Organization successfully created',
          organizationId,
        };
      })
      .catch((error) => {
        this.logger.error(`Error saving organization: ${error}`);
        throw new Error('Error saving organization');
      });
  }

  /**
   * Retrieves all organizations.
   * @returns {Promise<[]>} - A promise that resolves to an array of organization entities.
   */
  findAll() {
    return this.organizationsRepo.find().then((organizations) => {
      return organizations.map((organization) => ({
        ...organization,
        owner: organization.owner?.userId,
      }));
    });
  }

  /**
   * Retrieves a organization by their ID.
   * @param {number} organizationId - The ID of the organization to retrieve.
   * @returns {Promise<OrganizationEntity>} - A promise that resolves to the organization entity if found.
   */
  async findOne(organizationId: number) {
    const organization = await this.organizationsRepo.findOneBy({
      organizationId,
    });
    if (!organization) {
      this.logger.warn(`Organization with ID ${organizationId} not found`);
      throw new NotFoundException('Organization not found');
    }
    return {
      ...organization,
      owner: organization.owner?.userId,
    };
  }

  /**
   * Updates an existing organization.
   * @param {number} organizationId - The ID of the organization to update.
   * @param {UpdateOrganizationDto} updateOrganizationDto - The data transfer object containing updated organization information.
   * @returns {Promise<string>} - A promise that resolves to the updated organization entity.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the organization with the specified ID does not exist.
   * @throws {Error} - If an error occurs during the update process.
   */
  update(organizationId: number, updateOrganizationDto: UpdateOrganizationDto) {
    if (Object.keys(updateOrganizationDto).length === 0) {
      this.logger.warn(
        `No data provided for update organizationId ${organizationId}`,
      );
      throw new BadRequestException('No data provided for update');
    }

    return this.organizationsRepo
      .update(organizationId, updateOrganizationDto)
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(
            `Organization with ID ${organizationId} successfully updated`,
          );

          return 'Organization successfully updated';
        } else {
          this.logger.warn(
            `No organization found with ID ${organizationId} to update`,
          );
          throw new NotFoundException('Organization not found');
        }
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(
          `Error updating organization with ID ${organizationId}`,
          e.stack,
        );
        throw new Error('Error updating organization');
      });
  }

  /**
   * Removes a organization by their ID.
   * @param {number} organizationId - The ID of the organization to remove.
   * @returns {Promise<string>} - A promise that resolves to the removed organization entity.
   * @throws {NotFoundException} - If the organization with the specified ID does not exist.
   */
  async remove(organizationId: number) {
    const organization = await this.organizationsRepo.findOneBy({
      organizationId,
    });
    if (organization) {
      return this.organizationsRepo
        .remove(organization)
        .then(() => {
          this.logger.log(
            `Organization with ID ${organizationId} successfully removed`,
          );
          return 'Organization sucessfully removed';
        })
        .catch((e) => {
          this.logger.error(
            `Error removing organization with ID ${organizationId}`,
            e.stack,
          );
          throw new Error('Error deleting organization');
        });
    } else {
      this.logger.warn(
        `Organization with ID ${organizationId} not found for removal`,
      );
      throw new NotFoundException('Organization not found');
    }
  }

  /*Organization Users*/

  /**
   * Creates a new organization user.
   * @param {CreateOrganizationUserDto} createOrganizationUserDto - The data transfer object containing organization user information.
   * @returns {object} - Object containing message and organizationUserId.
   * @throws {NotFoundException} - If the user is not found.
   * @throws {Error} - If an error occurs during the save process.
   */
  async createOrganizationUser(
    createOrganizationUserDto: CreateOrganizationUserDto,
  ) {
    const { userId, organizationId, ...rest } = createOrganizationUserDto;

    const userAux = await this.usersService.findOne(userId);

    if (!userAux) {
      this.logger.error(`User with ID ${userId} was not found.`);
      return new NotFoundException(`User was not found`);
    }

    const organizationAux = await this.findOne(organizationId);

    if (!organizationAux) {
      this.logger.error(
        `Organization with ID ${organizationId} was not found.`,
      );
      return new NotFoundException(`Organization was not found`);
    }

    return this.organizationUserRepo
      .save(
        this.organizationUserRepo.create({
          ...rest,
          user: { userId: userAux.userId },
          organization: { organizationId: organizationAux.organizationId },
        }),
      )
      .then(({ organizationUserId }) => {
        this.logger.log(
          `OrganizationUser Id ${organizationUserId} saved successfully`,
        );
        return {
          message: 'OrganizationUser successfully created',
          organizationId,
        };
      })
      .catch((error) => {
        this.logger.error(`Error saving organizationUser: ${error}`);
        throw new Error('Error saving organizationUser');
      });
  }

  /**
   * Retrieves all organization users for a specific organization ID.
   * @param {number} organizationId - The ID of the organization to retrieve users for.
   * @returns {Promise<OrganizationUserEntity[]>} - A promise that resolves to an array of organization user entities.
   * @throws {NotFoundException} - If no users are found for the organization.
   */
  async findAllUsers(organizationId: number) {
    const organizationUsers = await this.organizationUserRepo.find({
      where: { organization: { organizationId } },
      relations: ['user', 'organization'],
    });

    if (!organizationUsers || organizationUsers.length === 0) {
      this.logger.warn(
        `No users found for organization with ID ${organizationId}`,
      );
      throw new NotFoundException('No users found for this organization');
    }

    return organizationUsers.map((orgUser) => ({
      ...orgUser,
      user: orgUser.user?.userId,
      organization: orgUser.organization?.organizationId,
    }));
  }

  /**
   * Updates an existing organization user.
   * @param {number} organizationUserId - The ID of the organization user to update.
   * @param {UpdateOrganizationUserDto} updateOrganizationUserDto - The data transfer object containing updated organization user information.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the organization user with the specified ID does not exist.
   * @throws {Error} - If an error occurs during the update process.
   */
  async updateOrganizationUser(
    organizationUserId: number,
    updateOrganizationUserDto: UpdateOrganizationUserDto,
  ) {
    if (Object.keys(updateOrganizationUserDto).length === 0) {
      this.logger.warn(
        `No data provided for update organizationUserId ${organizationUserId}`,
      );
      throw new BadRequestException('No data provided for update');
    }

    return this.organizationUserRepo
      .update(organizationUserId, updateOrganizationUserDto)
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(
            `Organization user with ID ${organizationUserId} successfully updated`,
          );
          return 'Organization user successfully updated';
        } else {
          this.logger.warn(
            `No organization user found with ID ${organizationUserId} to update`,
          );
          throw new NotFoundException('Organization user not found');
        }
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(
          `Error updating organization user with ID ${organizationUserId}`,
          e.stack,
        );
        throw new Error('Error updating organization user');
      });
  }

  /**
   * Removes an organization user by their ID.
   * @param {number} organizationUserId - The ID of the organization user to remove.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {NotFoundException} - If the organization user with the specified ID does not exist.
   * @throws {Error} - If an error occurs during the removal process.
   */
  async removeOrganizationUser(organizationUserId: number) {
    const organizationUser = await this.organizationUserRepo.findOneBy({
      organizationUserId,
    });

    if (!organizationUser) {
      this.logger.warn(
        `Organization user with ID ${organizationUserId} not found for removal`,
      );
      throw new NotFoundException('Organization user not found');
    }

    try {
      await this.organizationUserRepo.remove(organizationUser);
      this.logger.log(
        `Organization user with ID ${organizationUserId} successfully removed`,
      );
      return 'Organization user successfully removed';
    } catch (e) {
      this.logger.error(
        `Error removing organization user with ID ${organizationUserId}`,
        e.stack,
      );
      throw new Error('Error deleting organization user');
    }
  }
}
