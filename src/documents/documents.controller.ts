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
   * Creates a new document. If no userId is provided, it uses the userId from the request object.
   * @param {CreateDocumentDto} createDocumentDto - The data transfer object containing document details.
   * @param {Request} request - The request object containing user information.
   * @returns {Promise<{}>} - A promise that resolves to the created document object.
   */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() createDocumentDto: CreateDocumentDto, @Request() request) {
    if (!createDocumentDto.userId) {
      createDocumentDto.userId = request.user.userId;
    }
    return this.documentsService.create(createDocumentDto);
  }

  /**
   * Retrieves all documents.
   * @returns {Promise<[]>} - A promise that resolves to an array of documents.
   */
  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  /**
   * Retrieves a document by its ID.
   * @param {string} id - The ID of the document to retrieve.
   * @returns {Promise<{}>} - A promise that resolves to the document object.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(+id);
  }

  /**
   * Updates a document by its ID.
   * @param {string} id - The ID of the document to update.
   * @param {UpdateDocumentDto} updateDocumentDto - The data transfer object containing updated document details.
   * @returns {Promise<{}>} - A promise that resolves to the updated document object.
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(+id, updateDocumentDto);
  }

  /**
   * Deletes a document by its ID.
   * @param {string} id - The ID of the document to delete.
   * @returns {Promise<{}>} - A promise that resolves to the result of the deletion operation.
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(+id);
  }
}
