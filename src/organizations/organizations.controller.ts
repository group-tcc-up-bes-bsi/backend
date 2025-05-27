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
import { CreateOrganizationUserDto } from './dto/create-organizationUser.dto';
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
   * Get organization data.
   * Only organization members can access this endpoint.
   * @param {number} id - The ID of the organization to retrieve.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the organization object.
   */
  @Get('data/:id')
  getOrganizationData(@Param('id') id: number, @Request() request) {
    return this.organizationsService.getOrganizationData(id, +request.user.userId);
  }

  /**
   * Retrieves all organizations that this user is a member of.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the list of organizations.
   */
  @Get('/my')
  getMyOrganizations(@Request() request) {
    return this.organizationsService.findOrganizationsByUser(+request.user.userId);
  }

  /**
   * Creates a new organization.
   * @param {CreateOrganizationDto} dto - The data transfer object containing organization information.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the result of the operation.
   */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() dto: CreateOrganizationDto, @Request() request) {
    return this.organizationsService.createOrganization(dto, +request.user.userId);
  }

  /**
   * Updates an existing organization.
   * Only the organization themselves can access this endpoint.
   * @param {number} id - The ID of the organization to update.
   * @param {UpdateOrganizationDto} dto - The data transfer object containing updated organization information.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the result of the operation.
   */
  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateOrganizationDto, @Request() request) {
    return this.organizationsService.updateOrganization(+id, +request.user.userId, dto);
  }

  /**
   * Deletes a organization by their ID.
   * Only the organization themselves can access this endpoint.
   * @param {string} id - The ID of the organization to delete.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the result of the operation.
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() request) {
    return this.organizationsService.deleteOrganization(+id, +request.user.userId);
  }

  /**
   * Adds a user to an organization.
   * Only the organization owner can access this endpoint.
   * @param {CreateOrganizationUserDto} dto - Add user to organization data transfer object.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<any>} - A promise that resolves to the result of the operation.
   */
  @Post('addUser')
  addUserToOrganization(@Body() dto: CreateOrganizationUserDto, @Request() request) {
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
    return this.organizationsService.updateUserInviteStatus(dto, +request.user.userId);
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
