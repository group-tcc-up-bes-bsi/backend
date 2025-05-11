import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationEntity } from './entities/organization.entity';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UsersService } from 'src/users/users.service';
import { AddUserToOrganizationDto } from './dto/addUserToOrganization.dto';
import {
  OrganizationUserEntity,
  UserType,
} from './entities/organization-user.entity';
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
      .save(this.organizationsRepo.create({ ...rest }))
      .then(({ organizationId }) => {
        this.logger.log(`Organization Id ${organizationId} seved sucessfully`);
        return this.createOrganizationUser({
          userId: userCreatedId,
          organizationId,
          userType: UserType.OWNER,
        }).then(() => {
          return {
            message: 'Organization successfully created',
            organizationId,
          };
        });
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
    return this.organizationsRepo.find();
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
    return organization;
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
    if (!organization) {
      this.logger.warn(
        `Organization with ID ${organizationId} not found for removal`,
      );
      throw new NotFoundException('Organization not found');
    }

    try {
      await this.organizationUserRepo.delete({
        organization: { organizationId },
      });
      await this.organizationsRepo.remove(organization);

      this.logger.log(
        `Organization with ID ${organizationId} successfully removed`,
      );
      return 'Organization successfully removed';
    } catch (e) {
      this.logger.error(
        `Error removing organization with ID ${organizationId}`,
        e.stack,
      );
      throw new Error('Error deleting organization');
    }
  }

  /*Organization Users*/

  /**
   * Creates a new organization user.
   * @param {AddUserToOrganizationDto} dto - The data transfer object containing organization user information.
   * @returns {string} - A success message.
   * @throws {NotFoundException} - If the user is not found.
   * @throws {Error} - If an error occurs during the save process.
   */
  private async createOrganizationUser(dto: AddUserToOrganizationDto) {
    const { userId, organizationId, userType } = dto;

    const user = await this.usersService.findOne(userId);
    if (!user) {
      this.logger.error(`User ${userId} was not found.`);
      return new NotFoundException(`User was not found`);
    }

    const organization = await this.findOne(organizationId);
    if (!organization) {
      this.logger.error(`Organization ${organizationId} was not found.`);
      return new NotFoundException(`Organization was not found`);
    }

    const existingUser = await this.organizationUserRepo.findOne({
      where: {
        user: { userId },
        organization: { organizationId },
      },
    });

    if (existingUser) {
      this.logger.error(
        `User ${userId} is already in organization ${organizationId}`,
      );
      throw new Error('User is already in this organization');
    }

    return this.organizationUserRepo
      .save(
        this.organizationUserRepo.create({
          user,
          organization,
          userType,
          inviteAccepted: false,
        }),
      )
      .then(({ organizationUserId }) => {
        this.logger.debug(
          `OrganizationUser ${organizationUserId} saved successfully`,
        );
        return 'User successfully added to organization';
      })
      .catch((error) => {
        this.logger.error(`Error saving organizationUser: ${error.stack}`);
        throw new Error('Error adding user to the organization');
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
   * Adds a user to an organization.
   * Only the organization owner can access this resource.
   * @param {AddUserToOrganizationDto} dto - The data transfer object containing organization user information.
   * @param {number} requestUserId - The ID of the user making the request.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {UnauthorizedException} - If the user is not authorized to add a new user.
   */
  async addUserToOrganization(
    dto: AddUserToOrganizationDto,
    requestUserId: number,
  ) {
    const { organizationId } = dto;

    // First check if the requesting user is in the organization
    const requestUserOrg = await this.organizationUserRepo.findOneBy({
      organization: { organizationId },
      user: { userId: requestUserId },
    });

    if (!requestUserOrg) {
      this.logger.warn(
        `User ${requestUserId} is not part of organization ${organizationId}`,
      );
      throw new UnauthorizedException(
        'You are not a member of this organization',
      );
    }

    // Check if the user is allowed to add others
    if (requestUserOrg.userType !== UserType.OWNER) {
      this.logger.warn(
        `User ${requestUserId} is not authorized to add a new user to organization ${organizationId}.`,
      );
      throw new UnauthorizedException(
        'You do not have permission to add a user',
      );
    }

    return this.createOrganizationUser(dto);
  }

  /**
   * Removes a user from an organization.
   * Only the organization owner or the user themselves can access this endpoint.
   * @param {object }options - Options object.
   * @param {number} options.orgId - The ID of the organization.
   * @param {number} options.userId - The ID of the user to remove.
   * @param {boolean} options.requestUserId - ID from who made the request.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   */
  async removeUserFromOrganization(options) {
    const { orgId, userId, requestUserId } = options;

    const requestUserOrg = await this.organizationUserRepo.findOneBy({
      organization: { organizationId: orgId },
      user: { userId: requestUserId },
    });

    if (!requestUserOrg) {
      this.logger.warn(
        `User ${requestUserId} is not part of organization ${orgId}`,
      );
      throw new UnauthorizedException(
        'You are not a member of this organization',
      );
    }

    if (!requestUserOrg) {
      this.logger.warn(
        `User ${requestUserId} is not part of organization ${orgId}`,
      );
      throw new UnauthorizedException(
        'You are not a member of this organization',
      );
    }

    const requestUserType = requestUserOrg.userType;

    if (requestUserId !== userId && requestUserType !== UserType.OWNER) {
      this.logger.warn(
        `User${requestUserId} is not authorized to remove user ${userId} from organization`,
      );
      throw new UnauthorizedException(
        'You do not have permission to remove an user',
      );
    }

    const organizationUser = await this.organizationUserRepo.findOneBy({
      organization: { organizationId: orgId },
      user: { userId },
    });

    if (!organizationUser) {
      this.logger.warn(
        `Organization user ${userId} not found in organization ${orgId}`,
      );
      throw new NotFoundException('User not found in this organization');
    }

    try {
      await this.organizationUserRepo.remove(organizationUser);
      this.logger.log(`User ${userId} removed from organization ${orgId}`);
      return 'User successfully removed from organization';
    } catch (e) {
      this.logger.error(
        `Error removing user ${userId} from organization ${orgId}. Error:\n${e.stack}`,
      );
      throw new Error('Error removing user from organization');
    }
  }
}
