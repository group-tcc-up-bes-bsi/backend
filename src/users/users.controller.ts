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
}
