import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { AuthGuard } from '../auth/guards/auth.guards';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddUserToOrganizationDto } from './dto/addUserToOrganization.dto';
import { UpdateOrganizationUserDto } from './dto/update-organization-user.dto';

/**
 * Controller for managing organization.
 * Uses AuthGuard, only authenticated users can access this routes.
 */
@UseGuards(AuthGuard)
@Controller('organizations')
export class OrganizationsController {
  /**
   * Creates an instance of OrganizationsService.
   * @param {OrganizationsService} organizationsService - The service responsible for organization operations.
   */
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Retrieves all organizations.
   * //FIXME: Only administrators should be able to access this endpoint
   * @returns {Promise<[]>} - A promise that resolves to an array of organizations.
   */
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  /**
   * Retrieves a organization by their ID.
   * Only the organization themselves can access this endpoint.
   * @param {number} id - The ID of the organization to retrieve.
   * @returns {Promise<{}>} - A promise that resolves to the organization object.
   */
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.organizationsService.findOne(id);
  }

  /**
   * Creates a new organization.
   * @param {CreateOrganizationDto} createOrganizationDto - The data transfer object containing organization information.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the created organization object.
   */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto, @Request() request) {
    if (!createOrganizationDto.userCreatedId) {
      createOrganizationDto.userCreatedId = request.user.userId;
    }
    return this.organizationsService.create(createOrganizationDto);
  }

  /**
   * Updates an existing organization.
   * Only the organization themselves can access this endpoint.
   * @param {number} id - The ID of the organization to update.
   * @param {UpdateOrganizationDto} dto - The data transfer object containing updated organization information.
   * @returns {Promise<{}>} - A promise that resolves to the updated organization object.
   */
  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(+id, dto);
  }

  /**
   * Deletes a organization by their ID.
   * Only the organization themselves can access this endpoint.
   * @param {number} id - The ID of the organization to delete.
   * @returns {Promise<{}>} - A promise that resolves to the deleted organization object.
   */
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.organizationsService.remove(id);
  }

  /**
   * Adds a user to an organization.
   * Only the organization owner can access this endpoint.
   * @param {AddUserToOrganizationDto} dto - Add user to organization data transfer object.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<any>} - A promise that resolves to the result of the operation.
   */
  @Post('addUser')
  addUserToOrganization(@Body() dto: AddUserToOrganizationDto, @Request() request) {
    return this.organizationsService.addUserToOrganization(dto, +request.user.userId);
  }

  /**
   * Updates user permission in an organization.
   * Only the organization owner can access this endpoint.
   * @param {UpdateOrganizationUserDto} dto - Update organization user data transfer object.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<any>} - A promise that resolves to the result of the operation.
   */
  @Patch('updateUser/permission')
  updateUserPermission(@Body() dto: UpdateOrganizationUserDto, @Request() request) {
    return this.organizationsService.updateUserPermission(dto, +request.user.userId);
  }

  /**
   * Updates user invite status in an organization.
   * Only the user itself can access this endpoint.
   * @param {UpdateOrganizationUserDto} dto - Update organization user data transfer object.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<any>} - A promise that resolves to the result of the operation.
   */
  @Patch('updateUser/invite')
  updateUserInviteStatus(@Body() dto: UpdateOrganizationUserDto, @Request() request) {
    return this.organizationsService.updateUserPermission(dto, +request.user.userId);
  }

  /**
   * Removes a user from an organization.
   * Only the organization owner or its own user can access this endpoint.
   * @param {string} orgId - Organization ID.
   * @param {string} userId - User ID.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<any>} - A promise that resolves to the result of the operation.
   */
  @Delete('removeUser/:organizationId/:userId')
  removeUserFromOrganization(
    @Param('organizationId') orgId: string,
    @Param('userId') userId: string,
    @Request() request,
  ) {
    const options = {
      orgId: +orgId,
      userId: +userId,
      requestUserId: +request.user.userId,
    };
    return this.organizationsService.removeUserFromOrganization(options);
  }
}

// TODO: Enhance organization logic:
// 1. When a organization is created, organizationUser should be created automatically.
// 2. And the user who created the organization should be the owner of the organization.
// 3. When deleting a organization, its organizationUser should be deleted.
