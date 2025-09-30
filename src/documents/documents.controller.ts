import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AuthGuard } from 'src/auth/guards/auth.guards';

/**
 * Controller for managing documents.
 * Uses AuthGuard, only authenticated users can access its routes.
 */
@UseGuards(AuthGuard)
@Controller('documents')
export class DocumentsController {
  /**
   * Creates an instance of DocumentsController.
   * @param {DocumentsService} documentsService - The service responsible for document operations.
   */
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Retrieves a document by its ID.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - The ID of the document to retrieve.
   * @returns {Promise<{}>} - A promise that resolves to the document object.
   */
  @Get('id/:id')
  findOne(@Request() request, @Param('id') id: string) {
    return this.documentsService.findOne(+request.user.userId, +id);
  }

  /**
   * Retrieves all documents by organization ID..
   * @param {Request} request - The request object containing user information.
   * @param {string} id - The ID of the document to retrieve.
   * @returns {Promise<[]>} - A promise that resolves to an array of documents.
   */
  @Get('organization/:id')
  findAllByOrganization(@Request() request, @Param('id') id: string) {
    return this.documentsService.findAllByOrganization(+request.user.userId, +id);
  }

  /**
   * Retrieves all trashed (soft-deleted) documents by organization ID.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - The ID of the organization to retrieve trashed documents for.
   * @returns {Promise<[]>} - A promise that resolves to an array of trashed documents.
   */
  @Get('organization/:id/trashed')
  findAllTrashedByOrganization(@Request() request, @Param('id') id: string) {
    return this.documentsService.findAllTrashedByOrganization(+request.user.userId, +id);
  }

  /**
   * Creates a new document.
   * @param {Request} request - The request object containing user information.
   * @param {CreateDocumentDto} dto - The data transfer object containing document details.
   * @returns {Promise<{}>} - A promise that resolves to the created document object.
   */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Request() request, @Body() dto: CreateDocumentDto) {
    return this.documentsService.createDocument(+request.user.userId, dto);
  }

  /**
   * Updates a document by its ID.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - The ID of the document to update.
   * @param {UpdateDocumentDto} dto - The data transfer object containing updated document details.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   */
  @Patch(':id')
  update(@Request() request, @Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(+request.user.userId, +id, dto);
  }

  /**
   * Updates the active version ID of a document.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - The ID of the document to update.
   * @param {string} versionId - The ID of the document version to set as active.
   * @returns {Promise<object>} - A promise that resolves to an object containing a message and the document ID.
   */
  @Patch(':id/active-version/:versionId')
  updateActiveVersion(@Request() request, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.documentsService.updateActiveVersionId(+request.user.userId, +id, +versionId);
  }

  /**
   * Moves a document to the trash (soft delete).
   * @param {Request} request - The request object containing user information.
   * @param {string} id - The ID of the document to move to trash.
   * @returns {Promise<object>} - A promise that resolves to a success message.
   */
  @Patch(':id/trash')
  moveToTrash(@Request() request, @Param('id') id: string) {
    return this.documentsService.moveToTrash(+request.user.userId, +id);
  }

  /**
   * Restores a document from the trash.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - The ID of the document to restore from trash.
   * @returns {Promise<object>} - A promise that resolves to a success message.
   */
  @Patch(':id/restore')
  restoreFromTrash(@Request() request, @Param('id') id: string) {
    return this.documentsService.restoreFromTrash(+request.user.userId, +id);
  }

  /**
   * Deletes a document by its ID.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - The ID of the document to delete.
   * @returns {Promise<string>} - A promise that resolves to a success message.
   */
  @Delete(':id')
  remove(@Request() request, @Param('id') id: string) {
    return this.documentsService.remove(+request.user.userId, +id);
  }
}
