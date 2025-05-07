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

/**
 * Controller for managing organization.
 * Uses AuthGuard, only authenticated users can access its routes.
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
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() request,
  ) {
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
}
