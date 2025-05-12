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
import { OrganizationUserEntity, UserType } from './entities/organization-user.entity';
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

  ///////////////////////////////////////////////////////////////////////
  // Private general functions
  ///////////////////////////////////////////////////////////////////////

  /**
   * Checks if the user is the owner of the organization.
   * @param {number} userId - The ID of the user to check.
   * @param {number} organizationId - The ID of the organization to check.
   * @param {string} context - Function name that is calling this function.
   * @throws {UnauthorizedException} - If the user is not the owner of the organization.
   * @returns {Promise<void>} - A promise that resolves if the user is the owner.
   */
  private async checkIfUserIsOwner(userId: number, organizationId: number, context: string) {
    return this.organizationUserRepo
      .findOneBy({
        organization: { organizationId },
        user: { userId },
      })
      .then(({ userType }) => {
        if (userType !== UserType.OWNER) {
          this.logger.warn(
            `[SECURITY] User ${userId} is trying to update organization ${organizationId} via ${context}`,
          );
          throw new UnauthorizedException('You do not have permission to do this');
        }
      });
  }

  ///////////////////////////////////////////////////////////////////////
  // Public OrganizationUsers interfaces
  ///////////////////////////////////////////////////////////////////////

  /**
   * Creates a new organization.
   * @param {CreateOrganizationDto} dto - The data transfer object containing organization information.
   * @param {number} userId - The ID of the user creating the organization.
   * @returns {object} - Object containing message and organizationId.
   * @throws {NotFoundException} - If the user is not found.
   * @throws {Error} - If an error occurs during the save process.
   */
  async createOrganization(dto: CreateOrganizationDto, userId: number) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      this.logger.warn(`User with ID ${userId} was not found.`);
      return new NotFoundException(`User was not found`);
    }

    return this.organizationsRepo
      .save(this.organizationsRepo.create(dto))
      .then(({ organizationId }) => {
        this.logger.log(`Organization Id ${organizationId} saved sucessfully`);
        return this.createOrganizationUser({
          userId,
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
        this.logger.error('Error saving organization:', error.stack);
        throw new Error('Error saving organization');
      });
  }

  /**
   * Retrieves a organization by their ID.
   * @param {number} organizationId - The ID of the organization to retrieve.
   * @returns {OrganizationEntity} - The organization entity if found.
   */
  async findOneOrganization(organizationId: number) {
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
   * Retrieves all organizations for a specific user.
   * @param {number} userId - The ID of the user to retrieve organizations for.
   * @returns {Promise<[]>} - A promise that resolves to an array of organization entities.
   * @throws {NotFoundException} - If no organizations are found for the user.
   * @throws {Error} - If an error occurs during the retrieval process.
   */
  findOrganizationsByUser(userId: number) {
    return this.organizationUserRepo
      .find({
        where: { user: { userId } },
        relations: ['organization'],
      })
      .then((orgUsers) => {
        if (!orgUsers || orgUsers.length === 0) {
          this.logger.warn(`No organizations found for user with ID ${userId}`);
          throw new NotFoundException('No organizations found for this user');
        }
        return orgUsers.map((orgUser) => orgUser.organization);
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(`Error retrieving organizations for user with ID ${userId}`, e.stack);
        throw new Error('Error retrieving organizations');
      });
  }

  /**
   * Updates an existing organization.
   * Only the organization owner can access this handler.
   * @param {number} organizationId - The ID of the organization to update.
   * @param {number} requestUserId - The ID of the user making the request.
   * @param {UpdateOrganizationDto} dto  - The data transfer object containing updated organization information.
   * @returns {string} - A success message.
   * @throws {UnauthorizedException} - If the user is not authorized to update the organization.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the organization with the specified ID does not exist.
   * @throws {Error} - If an error occurs during the update process.
   */
  async updateOrganization(
    organizationId: number,
    requestUserId: number,
    dto: UpdateOrganizationDto,
  ) {
    // Security check
    await this.checkIfUserIsOwner(organizationId, requestUserId, 'updateOrganization');

    if (Object.keys(dto).length === 0) {
      this.logger.warn(`No data provided for update organizationId ${organizationId}`);
      throw new BadRequestException('No data provided for update');
    }

    return this.organizationsRepo
      .update(organizationId, dto)
      .then(({ affected }) => {
        if (affected > 0) {
          this.logger.log(`Organization with ID ${organizationId} successfully updated`);
          return 'Organization successfully updated';
        } else {
          this.logger.warn(`No organization found with ID ${organizationId} to update`);
          throw new NotFoundException('Organization not found');
        }
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(`Error updating organization with ID ${organizationId}`, e.stack);
        throw new Error('Error updating organization');
      });
  }

  /**
   * Deletes a organization by their ID.
   * Only the organization owner can access this handler.
   * @param {number} organizationId - The ID of the organization to delete.
   * @param {number} requestUserId - The ID of the user making the request.
   * @throws {UnauthorizedException} - If the user is not authorized to delete the organization.
   * @throws {NotFoundException} - If the organization with the specified ID does not exist.
   * @throws {Error} - If an error occurs during the deletion process.
   * @returns {string} - A success message.
   */
  async deleteOrganization(organizationId: number, requestUserId: number) {
    // Security check
    await this.checkIfUserIsOwner(organizationId, requestUserId, 'deleteOrganization');

    const organization = await this.organizationsRepo.findOneBy({
      organizationId,
    });

    if (!organization) {
      this.logger.warn(`Organization with ID ${organizationId} not found for removal`);
      throw new NotFoundException('Organization not found');
    }

    try {
      await this.organizationUserRepo.delete({
        organization: { organizationId },
      });
      await this.organizationsRepo.remove(organization);

      this.logger.log(`Organization with ID ${organizationId} successfully removed`);
      return 'Organization successfully removed';
    } catch (e) {
      this.logger.error(`Error removing organization with ID ${organizationId}`, e.stack);
      throw new Error('Error deleting organization');
    }
  }

  //////////////////////////////////////////////////////////////////////
  // Private OrganizationUsers functions
  ///////////////////////////////////////////////////////////////////////

  /**
   * Creates a new organization user.
   * @param {AddUserToOrganizationDto} dto - The data transfer object containing organization user information.
   * @returns {string} - A success message.
   * @throws {NotFoundException} - If the user is not found.
   * @throws {Error} - If an error occurs during the save process.
   */
  private async createOrganizationUser(dto: AddUserToOrganizationDto) {
    const { userId, organizationId, userType } = dto;

    // Check if the user is already in the organization
    const existingUser = await this.organizationUserRepo.findOneBy({
      organization: { organizationId },
      user: { userId },
    });

    if (existingUser) {
      throw new BadRequestException('User is already a member of this organization');
    }

    const user = await this.usersService.findOne(userId);
    if (!user) {
      this.logger.error(`User ${userId} was not found.`);
      return new NotFoundException(`User was not found`);
    }

    const organization = await this.findOneOrganization(organizationId);
    if (!organization) {
      this.logger.error(`Organization ${organizationId} was not found.`);
      return new NotFoundException(`Organization was not found`);
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
        this.logger.debug(`OrganizationUser ${organizationUserId} saved successfully`);
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
   * @returns {Promise<object[]>} - A promise that resolves to an array of organization user entities.
   * @throws {NotFoundException} - If no users are found for the organization.
   */
  private async findAllOrganizationUser(organizationId: number) {
    const organizationUsers = await this.organizationUserRepo.find({
      where: { organization: { organizationId } },
      relations: ['user'],
    });

    if (!organizationUsers || organizationUsers.length === 0) {
      this.logger.log(`No users found for organization with ID ${organizationId}`);
      throw new NotFoundException('No users found for this organization');
    }

    return organizationUsers.map((orgUser) => ({
      user: orgUser.user.username,
      userType: orgUser.userType,
      inviteAccepted: orgUser.inviteAccepted,
    }));
  }

  /**
   * Updates an existing organization user.
   * @param {UpdateOrganizationUserDto} dto - The data transfer object containing updated OrganizationUser information.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {NotFoundException} - If the OrganizationUser was not found.
   * @throws {Error} - If an error occurs during the update process.
   */
  private async updateOrganizationUser(dto: UpdateOrganizationUserDto) {
    const { organizationUserId } = await this.organizationUserRepo.findOneBy({
      organization: { organizationId: dto.organizationId },
      user: { userId: dto.userId },
    });

    if (!organizationUserId) {
      throw new NotFoundException('User not found in the organization');
    }

    return this.organizationUserRepo
      .update(organizationUserId, dto)
      .then(() => {
        return 'Organization user successfully updated';
      })
      .catch((e) => {
        this.logger.error(
          `Error updating organization user with ID ${organizationUserId}`,
          e.stack,
        );
        throw new Error('Error updating organization user');
      });
  }

  /**
   * Removes a user from an organization.
   * @param {number} organizationId - The ID of the organization.
   * @param {number} userId - The ID of the user to remove.
   * @throws {NotFoundException} - If the user is not found in the organization.
   * @throws {Error} - If an error occurs during the removal process.
   * @returns {string} - A success message.
   */
  private async removeOrganizationUser(organizationId, userId) {
    const organizationUser = await this.organizationUserRepo.findOneBy({
      organization: { organizationId },
      user: { userId },
    });

    if (!organizationUser) {
      throw new NotFoundException('User not found in this organization');
    }

    try {
      await this.organizationUserRepo.remove(organizationUser);
      this.logger.log(`User ${userId} removed from organization ${organizationId}`);
      return 'User successfully removed from organization';
    } catch (e) {
      this.logger.error(
        `Error removing user ${userId} from organization ${organizationId}.`,
        e.stack,
      );
      throw new Error('Error removing user from organization');
    }
  }

  //////////////////////////////////////////////////////////////////////
  // Public OrganizationUsers interfaces
  ///////////////////////////////////////////////////////////////////////

  /**
   * Adds a user to an organization.
   * Only the organization owner can access this resource.
   * @param {AddUserToOrganizationDto} dto - The data transfer object containing organization user information.
   * @param {number} requestUserId - The ID of the user making the request.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {UnauthorizedException} - If the user is not authorized to add a new user.
   */
  async addUserToOrganization(dto: AddUserToOrganizationDto, requestUserId: number) {
    await this.checkIfUserIsOwner(dto.organizationId, requestUserId, 'addUserToOrganization');
    return this.createOrganizationUser(dto);
  }

  /**
   * Retrieves all users from an organization.
   * Only the organization users themselves can access this handler.
   * @param {number} organizationId - The ID of the organization to retrieve users for.
   * @param {number} requestUserId - The ID of the user making the request.
   * @returns {Promise<object[]>} - A promise that resolves to an array of organization user entities.
   * @throws {UnauthorizedException} - If the user is not authorized to get users.
   */
  async getUsersFromOrganization(organizationId: number, requestUserId: number) {
    // Check if the user is in the organization
    const existingUser = await this.organizationUserRepo.findOneBy({
      organization: { organizationId },
      user: { userId: requestUserId },
    });

    if (!existingUser) {
      this.logger.warn(
        `[SECURITY] User ${requestUserId} is trying to get users outside from organization ${organizationId}.`,
      );
      throw new UnauthorizedException('You do not have permission to do this');
    }

    return this.findAllOrganizationUser(organizationId);
  }

  /**
   * Updates the permission of an organization user.
   * Only the organization owner can access this handler.
   * @param {UpdateOrganizationUserDto} dto - The data transfer object containing updated OrganizationUser information.
   * @param {number} requestUserId - The ID of the user making the request.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {BadRequestException} - If no new userType is provided.
   * @throws {UnauthorizedException} - If the user is not authorized to update permissions.
   */
  async updateUserPermission(dto: UpdateOrganizationUserDto, requestUserId: number) {
    await this.checkIfUserIsOwner(dto.organizationId, requestUserId, 'updateUserPermission');

    if (dto.inviteAccepted) {
      this.logger.warn(
        `[SECURITY] User ${requestUserId} is trying to update inviteAccepted on updateUserPermission`,
      );
      throw new UnauthorizedException('You do not have permission to change inviteAccepted');
    }

    if (!dto.userType) {
      throw new BadRequestException('New user permission must be provided');
    }

    return this.updateOrganizationUser(dto);
  }

  /**
   * Updates the invite status of an user in an organization.
   * Only the user themselves can access this handler.
   * @param {UpdateOrganizationUserDto} dto - The data transfer object containing updated OrganizationUser information.
   * @param {number} requestUserId - The ID of the user making the request.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {BadRequestException} - If no new invite status is provided.
   * @throws {UnauthorizedException} - If the user is not authorized to update.
   */
  async updateUserInviteStatus(dto: UpdateOrganizationUserDto, requestUserId: number) {
    if (requestUserId !== dto.userId) {
      this.logger.warn(
        `[SECURITY] User ${requestUserId} is trying to change invite status from user ${dto.userId}.`,
      );
      throw new UnauthorizedException('You do not have permission to do this');
    }

    if (dto.userType) {
      this.logger.warn(
        `[SECURITY] User ${requestUserId} is trying to update userType on updateUserInviteStatus`,
      );
      throw new UnauthorizedException('You do not have permission to change userType');
    }

    if (!dto.inviteAccepted) {
      throw new BadRequestException('New user invite status must be provided');
    }

    return this.updateOrganizationUser(dto);
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

    const { userType: requestUserType } = await this.organizationUserRepo.findOneBy({
      organization: { organizationId: orgId },
      user: { userId: requestUserId },
    });

    // Check if the user is allowed to delete
    if (requestUserId !== userId || requestUserType !== UserType.OWNER) {
      this.logger.warn(
        `[SECURITY] User ${requestUserId} is trying to remove user ${userId} from organization ${orgId}`,
      );
      throw new UnauthorizedException('You do not have permission to do this');
    }

    return this.removeOrganizationUser(orgId, userId);
  }
}
