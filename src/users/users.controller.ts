import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Request,
  Logger,
  Patch,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guards';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password';

/**
 * Controller for managing users.
 * Provides endpoints for creating, updating, deleting, and retrieving user information.
 */
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  /**
   * Creates an instance of UsersController.
   * @param {UsersService} usersService - The service responsible for user operations.
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * Verifies if the user has access to the requested resource.
   * This method checks if the user ID in the request matches the ID of the resource being accessed.
   * @param {number} id - The ID of the resource being accessed.
   * @param {Request} request - The request object containing user information.
   * @throws {ForbiddenException} - If the user is not authorized to access this resource.
   */
  private checkUserAccess(id: number, @Request() request) {
    if (+request.user.userId !== id) {
      this.logger.warn(`User with ID ${request.user.userId} tried to access user with ID ${id}`);
      throw new ForbiddenException('You are not authorized to access this resource');
    }
  }

  /**
   * Retrieves a user by their ID.
   * Only the user themselves can access this endpoint.
   * @param {string} id - The ID of the user to retrieve.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the user object.
   * @throws {ForbiddenException} - If the user is not authorized to access this resource.
   */
  @UseGuards(AuthGuard)
  @Get('by-id/:id')
  findOne(@Param('id') id: string, @Request() request) {
    this.checkUserAccess(+id, request);
    return this.usersService.findOne(+id);
  }

  /**
   * Retrieves a user by their username.
   * @param {string} username - The username of the user to retrieve.
   * @returns {Promise<object>} - A promise that resolves to the user object.
   */
  @UseGuards(AuthGuard)
  @Get('by-username')
  findByUsername(@Query('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  /**
   * Retrieves a username by user ID.
   * @param {string} id - The ID of the user.
   * @returns {Promise<object>} - A promise that resolves to the username.
   */
  @UseGuards(AuthGuard)
  @Get('username/:id')
  findUsernameById(@Param('id') id: string): Promise<object> {
    return this.usersService.findUsernameById(+id);
  }

  /**
   * Creates a new user.
   * @param {CreateUserDto} dto - The data transfer object containing user information.
   * @returns {Promise<object>} - A promise that resolves to the created user object.
   */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * Updates the password of an existing user.
   * Only the user themselves or an admin can access this endpoint.
   * @param {UpdateUserPasswordDto} dto - The body containing the dto and adminPass.
   * @returns {Promise<object>} - A promise that resolves to the updated user object.
   */
  @Patch('update-password')
  updatePassword(@Body() dto: UpdateUserPasswordDto) {
    return this.usersService.updatePassword(dto);
  }

  /**
   * Updates an existing user.
   * Only the user themselves can access this endpoint.
   * @param {string} id - The ID of the user to update.
   * @param {UpdateUserDto} dto - The data transfer object containing updated user information.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the updated user object.
   * @throws {ForbiddenException} - If the user is not authorized to access this resource.
   */
  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() request) {
    this.checkUserAccess(+id, request);
    return this.usersService.update(+id, dto);
  }

  /**
   * Deletes a user by their ID.
   * Only the user themselves can access this endpoint.
   * @param {string} id - The ID of the user to delete.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the deleted user object.
   * @throws {ForbiddenException} - If the user is not authorized to access this resource.
   */
  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() request) {
    this.checkUserAccess(+id, request);
    return this.usersService.remove(+id);
  }

  /**
   * Adds an organization to the user's list of favorite organizations.
   * @param {string} orgId - The ID of the organization.
   * @param {Request} request - The request object.
   * @returns {Promise<object>} - A promise that resolves when the operation is completed.
   */
  @UseGuards(AuthGuard)
  @Post('/favorites/organizations/:orgId')
  addFavoriteOrganization(@Param('orgId') orgId: string, @Request() request) {
    return this.usersService.addFavoriteOrganization(+request.user.userId, +orgId);
  }

  /**
   * Removes an organization from the user's list of favorite organizations.
   * @param {string} orgId - The ID of the organization.
   * @param {Request} request - The request object.
   * @returns {Promise<object>} - A promise that resolves when the operation is completed.
   */
  @UseGuards(AuthGuard)
  @Delete('/favorites/organizations/:orgId')
  removeFavoriteOrganization(@Param('orgId') orgId: string, @Request() request) {
    return this.usersService.removeFavoriteOrganization(+request.user.userId, +orgId);
  }

  /**
   * Retrieves the list of favorite organizations for the authenticated user.
   * @param {Request} request - The request object.
   * @returns {Promise<[]>} - A promise that resolves to an array of favorite organizations.
   */
  @UseGuards(AuthGuard)
  @Get('/favorites/organizations')
  getFavoriteOrganizations(@Request() request) {
    return this.usersService.getFavoriteOrganizations(+request.user.userId);
  }

  /**
   * Adds a document to the user's list of favorite documents.
   * @param {string} docId - The ID of the document.
   * @param {Request} request - The request object.
   * @returns {Promise<object>} - A promise that resolves when the operation is completed.
   */
  @UseGuards(AuthGuard)
  @Post('/favorites/documents/:docId')
  addFavoriteDocument(@Param('docId') docId: string, @Request() request) {
    return this.usersService.addFavoriteDocument(+request.user.userId, +docId);
  }

  /**
   * Removes a document from the user's list of favorite documents.
   * @param {string} docId - The ID of the document.
   * @param {Request} request - The request object.
   * @returns {Promise<object>} - A promise that resolves when the operation is completed.
   */
  @UseGuards(AuthGuard)
  @Delete('/favorites/documents/:docId')
  removeFavoriteDocument(@Param('docId') docId: string, @Request() request) {
    return this.usersService.removeFavoriteDocument(+request.user.userId, +docId);
  }

  /**
   * Retrieves the list of favorited documents for the authenticated user.
   * @param {Request} request - The request object.
   * @returns {Promise<[]>} - A promise that resolves to an array of favorited documents.
   */
  @UseGuards(AuthGuard)
  @Get('/favorites/documents')
  getFavoriteDocuments(@Request() request) {
    return this.usersService.getFavoriteDocuments(+request.user.userId);
  }
}
