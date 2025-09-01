import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization, OrganizationType } from './entities/organization.entity';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UsersService } from 'src/users/users.service';
import { CreateOrganizationUserDto } from './dto/create-organization-user.dto';
import { OrganizationUser, UserType } from './entities/organization-user.entity';
import { UpdateOrganizationUserDto } from './dto/update-organization-user.dto';

/**
 * Service for managing organizations.
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  /**
   * Creates an instance of OrganizationsService.
   * @param {Repository<Organization>} organizationsRepo - The repository for organization entities.
   * @param {Repository<OrganizationUser>} organizationUserRepo - The repository for organization user entities.
   * @param {UsersService} usersService - The service for managing users.
   */
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepo: Repository<Organization>,
    @InjectRepository(OrganizationUser)
    private readonly organizationUserRepo: Repository<OrganizationUser>,
    private usersService: UsersService,
  ) {}

  ///////////////////////////////////////////////////////////////////////
  // Private general functions
  ///////////////////////////////////////////////////////////////////////

  /**
   * Check if user exists in the organization.
   * @param {number} userId - The ID of the user to check.
   * @param {number} organizationId - The ID of the organization to check.
   * @returns {Promise<OrganizationUser>} - A promise that resolves to the organization user entity if found.
   * @throws {ForbiddenException} - If the user is not part of the organization.
   */
  private checkIfUserExistsOnOrganization(userId: number, organizationId: number) {
    return this.organizationUserRepo
      .findOneBy({
        organizationId,
        userId,
      })
      .then((user) => {
        if (!user) {
          throw new ForbiddenException('The request user is not part of this organization');
        }
        return user;
      });
  }

  /**
   * Checks if the user is the owner of the organization.
   * @param {number} userId - The ID of the user to check.
   * @param {number} organizationId - The ID of the organization to check.
   * @param {string} context - Function name that is calling this function.
   * @throws {ForbiddenException} - If the user is not the owner of the organization.
   * @returns {Promise<void>} - A promise that resolves if the user is the owner.
   */
  private async checkIfUserIsOwner(userId: number, organizationId: number, context: string) {
    const user = await this.checkIfUserExistsOnOrganization(userId, organizationId);

    if (user?.userType !== UserType.OWNER) {
      this.logger.warn(`[SECURITY] User ${userId} is trying to update organization ${organizationId} via ${context}`);
      throw new ForbiddenException('You do not have permission to do this');
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Public general functions
  ///////////////////////////////////////////////////////////////////////

  /**
   * Checks if the user has the expected role in the organization.
   * @param {number} userId - The ID of the user to check.
   * @param {number} orgId - The ID of the organization to check.
   * @param {UserType} expectedRoles - Expected organization roles.
   * @returns {Promise<boolean>} - A promise that resolves true if the user has the expected role.
   */
  async checkUserRole(userId: number, orgId: number, expectedRoles: Array<UserType>): Promise<boolean> {
    try {
      const user = await this.checkIfUserExistsOnOrganization(userId, orgId);
      if (expectedRoles.includes(user?.userType)) {
        return true;
      }
      return false;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return false;
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Private Organization functions
  ///////////////////////////////////////////////////////////////////////

  /**
   * Retrieves a organization by their ID.
   * @param {number} organizationId - The ID of the organization to retrieve.
   * @returns {Organization} - The organization entity if found.
   */
  private async findOneOrganization(organizationId: number) {
    const organization = await this.organizationsRepo.findOne({
      where: { organizationId },
      relations: ['organizationUsers'],
    });

    if (!organization) {
      this.logger.warn(`Organization with ID ${organizationId} not found`);
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  ///////////////////////////////////////////////////////////////////////
  // Public Organization interfaces
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
    const { organizationId } = await this.organizationsRepo.save(this.organizationsRepo.create(dto)).catch((error) => {
      this.logger.error('Error saving organization:', error.stack);
      throw new Error('Error saving organization');
    });
    this.logger.debug(`Organization Id ${organizationId} saved sucessfully`);

    await this.createOrganizationUser(
      {
        userId,
        organizationId,
        userType: UserType.OWNER,
      },
      true,
    );

    return {
      message: 'Organization created successfully',
      organizationId,
    };
  }

  /**
   * Updates an existing organization.
   * Only the organization owner can access this handler.
   * @param {number} organizationId - The ID of the organization to update.
   * @param {number} requestUserId - The ID of the user making the request.
   * @param {UpdateOrganizationDto} dto  - The data transfer object containing updated organization information.
   * @returns {string} - A success message.
   * @throws {ForbiddenException} - If the user is not authorized to update the organization.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the organization with the specified ID does not exist.
   * @throws {Error} - If an error occurs during the update process.
   */
  async updateOrganization(organizationId: number, requestUserId: number, dto: UpdateOrganizationDto) {
    if (Object.keys(dto).length === 0) {
      this.logger.warn(`No data provided for update organizationId ${organizationId}`);
      throw new BadRequestException('No data provided for update');
    }

    // Check if organization exists
    await this.organizationsRepo
      .findOneBy({
        organizationId,
      })
      .then((organization) => {
        if (!organization) {
          throw new NotFoundException('Organization not found');
        }
      });

    // Security check
    await this.checkIfUserIsOwner(requestUserId, organizationId, 'updateOrganization');

    return this.organizationsRepo
      .update(organizationId, dto)
      .then(({ affected }) => {
        if (affected > 0) {
          this.logger.debug(`Organization with ID ${organizationId} successfully updated`);
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
   * @throws {ForbiddenException} - If the user is not authorized to delete the organization.
   * @throws {NotFoundException} - If the organization with the specified ID does not exist.
   * @throws {Error} - If an error occurs during the deletion process.
   * @returns {string} - A success message.
   */
  async deleteOrganization(organizationId: number, requestUserId: number) {
    if (isNaN(organizationId)) {
      this.logger.warn(`Invalid organizationId ${organizationId} provided for deletion`);
      throw new BadRequestException('Invalid organizationId provided');
    }

    const organization = await this.organizationsRepo.findOneBy({
      organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Security check
    await this.checkIfUserIsOwner(requestUserId, organizationId, 'deleteOrganization');

    try {
      await this.organizationsRepo.remove(organization);

      this.logger.debug(`Organization with ID ${organizationId} successfully removed`);
      return 'Organization successfully removed';
    } catch (e) {
      this.logger.error(`Error removing organization with ID ${organizationId}`, e.stack);
      throw new Error('Error deleting organization');
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Private OrganizationUsers functions
  ///////////////////////////////////////////////////////////////////////

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
      this.logger.debug(`No users found for organization with ID ${organizationId}`);
      throw new NotFoundException('No users found for this organization');
    }

    return organizationUsers.map((orgUser) => ({
      user: orgUser.user.username,
      userType: orgUser.userType,
      inviteAccepted: orgUser.inviteAccepted,
    }));
  }

  /**
   * Creates a new organization user.
   * @param {CreateOrganizationUserDto} dto - The data transfer object containing organization user information.
   * @param {boolean} isFirstUser - True if this was called on createOrganization.
   * @returns {string} - A success message.
   * @throws {NotFoundException} - If the user is not found.
   * @throws {Error} - If an error occurs during the save process.
   */
  private async createOrganizationUser(dto: CreateOrganizationUserDto, isFirstUser: boolean = false) {
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
      throw new NotFoundException(`User was not found`);
    }

    const organization = await this.findOneOrganization(organizationId);
    if (!organization) {
      this.logger.error(`Organization ${organizationId} was not found.`);
      throw new NotFoundException(`Organization was not found`);
    }

    if (!isFirstUser && organization.organizationType === OrganizationType.INDIVIDUAL) {
      throw new BadRequestException('This organization is individual');
    }

    return this.organizationUserRepo
      .save(
        this.organizationUserRepo.create({
          user,
          organization,
          userType,
          inviteAccepted: isFirstUser ? true : false,
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
   * Updates an existing organization user.
   * @param {UpdateOrganizationUserDto} dto - The data transfer object containing updated OrganizationUser information.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {NotFoundException} - If the OrganizationUser was not found.
   * @throws {Error} - If an error occurs during the update process.
   */
  private async updateOrganizationUser(dto: UpdateOrganizationUserDto) {
    const organizationUser = await this.organizationUserRepo.findOneBy({
      organization: { organizationId: dto.organizationId },
      user: { userId: dto.userId },
    });

    if (!organizationUser) {
      throw new NotFoundException('User not found in the organization');
    }

    const { organizationUserId } = organizationUser;

    return this.organizationUserRepo
      .update(organizationUserId, dto)
      .then(() => {
        return 'Organization user successfully updated';
      })
      .catch((e) => {
        this.logger.error(`Error updating organization user with ID ${organizationUserId}`, e.stack);
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
      this.logger.debug(`User ${userId} removed from organization ${organizationId}`);
      return 'User successfully removed from organization';
    } catch (e) {
      this.logger.error(`Error removing user ${userId} from organization ${organizationId}.`, e.stack);
      throw new Error('Error removing user from organization');
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Public OrganizationUsers interfaces
  ///////////////////////////////////////////////////////////////////////

  /**
   * Adds a user to an organization.
   * Only the organization owner can access this resource.
   * @param {CreateOrganizationUserDto} dto - The data transfer object containing organization user information.
   * @param {number} requestUserId - The ID of the user making the request.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {ForbiddenException} - If the user is not authorized to add a new user.
   */
  async addUserToOrganization(dto: CreateOrganizationUserDto, requestUserId: number) {
    await this.checkIfUserIsOwner(requestUserId, dto.organizationId, 'addUserToOrganization');
    return this.createOrganizationUser(dto);
  }

  /**
   * Updates the permission of an organization user.
   * Only the organization owner can access this handler.
   * @param {UpdateOrganizationUserDto} dto - The data transfer object containing updated OrganizationUser information.
   * @param {number} requestUserId - The ID of the user making the request.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   * @throws {BadRequestException} - If no new userType is provided.
   * @throws {ForbiddenException} - If the user is not authorized to update permissions.
   */
  async updateUserPermission(dto: UpdateOrganizationUserDto, requestUserId: number) {
    await this.checkIfUserIsOwner(requestUserId, dto.organizationId, 'updateUserPermission');

    if (dto.inviteAccepted) {
      this.logger.warn(`[SECURITY] User ${requestUserId} is trying to update inviteAccepted on updateUserPermission`);
      throw new ForbiddenException('You do not have permission to change inviteAccepted');
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
   * @throws {ForbiddenException} - If the user is not authorized to update.
   */
  async updateUserInviteStatus(dto: UpdateOrganizationUserDto, requestUserId: number) {
    if (requestUserId !== dto.userId) {
      this.logger.warn(`[SECURITY] User ${requestUserId} is trying to change invite status from user ${dto.userId}.`);
      throw new ForbiddenException('You do not have permission to do this');
    }

    if (dto.userType) {
      this.logger.warn(`[SECURITY] User ${requestUserId} is trying to update userType on updateUserInviteStatus`);
      throw new ForbiddenException('You do not have permission to change userType');
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

    const requestUser = await this.organizationUserRepo.findOneBy({
      organization: { organizationId: orgId },
      user: { userId: requestUserId },
    });

    // Check if the user is allowed to delete
    if (requestUserId !== userId && requestUser?.userType !== UserType.OWNER) {
      this.logger.warn(
        `[SECURITY] User ${requestUserId} is trying to remove user ${userId} from organization ${orgId}`,
      );
      throw new ForbiddenException('You do not have permission to do this');
    }

    return this.removeOrganizationUser(orgId, userId);
  }

  ///////////////////////////////////////////////////////////////////////
  // Public Getters
  ///////////////////////////////////////////////////////////////////////

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
        where: { userId },
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
   * Retrieves organization data for a specific organization.
   * @param {number} organizationId - The ID of the organization to retrieve data for.
   * @param {number} requestUserId - The ID of the user making the request.
   * @returns {Promise<object>} - A promise that resolves to the organization data.
   * @throws {ForbiddenException} - If the user is not part of the organization.
   */
  async getOrganizationData(organizationId: number, requestUserId: number) {
    await this.checkIfUserExistsOnOrganization(requestUserId, organizationId);

    const promiseArray = [this.findOneOrganization(organizationId), this.findAllOrganizationUser(organizationId)];

    return Promise.all(promiseArray).then(([organization, users]) => {
      return {
        ...organization,
        organizationUsers: users,
      };
    });
  }
}
