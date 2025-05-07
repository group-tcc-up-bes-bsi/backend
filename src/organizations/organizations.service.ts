import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationEntity } from './entities/organizations.entity';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UsersService } from 'src/users/users.service';

/**
 * Service for managing organizations.
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  /**
   * Creates an instance of OrganizationsService.
   * @param {Repository<OrganizationEntity>} organizationsRepo - The repository for organization entities.
   * @param {UsersService} usersService - The service for managing users.
   */
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationsRepo: Repository<OrganizationEntity>,
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
}
