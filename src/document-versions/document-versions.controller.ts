import {
  Controller,
  //Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { DocumentVersionsService } from './document-versions.service';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import { AuthGuard } from 'src/auth/guards/auth.guards';

/**
 * Controller for managing document versions.
 */
@UseGuards(AuthGuard)
@Controller('document-versions')
export class DocumentVersionsController {
  /**
   * Creates an instance of DocumentVersionsController.
   * @param {DocumentVersionsService} documentVersionsService - Document versions service.
   */
  constructor(private readonly documentVersionsService: DocumentVersionsService) {}

  /**
   * Creates a new document version.
   * @param {Request} request - The request object containing user information.
   * @param {CreateDocumentVersionDto} dto - DocumentVersion data transfer object.
   * @returns {Promise<{}>} - A promise that resolves when the document version object is created.
   */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Request() request, @Body() dto: CreateDocumentVersionDto): Promise<object> {
    return this.documentVersionsService.create(+request.user.userId, dto);
  }

  /*

  @Get()
  findAll() {
    return this.documentVersionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentVersionsService.findOne(+id);
  }

  */

  /**
   * Updates a document version.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - Document Version ID
   * @param {UpdateDocumentVersionDto} dto - DocumentVersion data transfer object.
   * @returns {Promise<object>} - A promise that resolves when the document version object is updated.
   */
  @Patch(':id')
  update(@Request() request, @Param('id') id: string, @Body() dto: UpdateDocumentVersionDto): Promise<object> {
    return this.documentVersionsService.update(+request.user.userId, +id, dto);
  }

  /**
   * Deletes a document version.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - Document Version ID
   * @returns {Promise<object>} - A promise that resolves when the document version is deleted.
   */
  @Delete(':id')
  remove(@Request() request, @Param('id') id: string): Promise<object> {
    return this.documentVersionsService.remove(+request.user.userId, +id);
  }
}
