import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  UploadedFile,
  UseInterceptors,
  Response,
} from '@nestjs/common';
import { DocumentVersionsService } from './document-versions.service';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import { AuthGuard } from 'src/auth/guards/auth.guards';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage, File } from 'multer';

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
   * @param {File} file - The uploaded file.
   * @returns {Promise<{}>} - A promise that resolves when the document version object is created.
   */
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB of file size limit
    }),
  )
  @Post()
  create(@Request() request, @Body() dto: CreateDocumentVersionDto, @UploadedFile() file: File): Promise<object> {
    return this.documentVersionsService.create(+request.user.userId, dto, file);
  }

  /**
   * Downloads a document version by ID.
   * @param {Request} request - The request object containing user information.
   * @param {Response} response - The response object to send the file.
   * @param {string} id - Document Version ID
   * @returns {Promise<void>} - A promise that resolves when the file is sent.
   */
  @Get('download/:id')
  async download(@Request() request, @Response() response, @Param('id') id: string): Promise<void> {
    const { buffer, filename, mimeType } = await this.documentVersionsService.downloadVersion(
      +request.user.userId,
      +id,
    );
    response.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    response.send(buffer);
  }

  /**
   * Finds a document version by ID.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - Document Version ID
   * @returns {Promise<object>} - A promise that resolves to the found document version object.
   */
  @Get('id/:id')
  findOne(@Request() request, @Param('id') id: string): Promise<object> {
    return this.documentVersionsService.findOne(+request.user.userId, +id);
  }

  /**
   * Finds document versions by document ID.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - Document ID
   * @returns {Promise<Array<object>>} - A promise that resolves to an array of document version objects.
   */
  @Get('document/:id')
  findByDocument(@Request() request, @Param('id') id: string): Promise<Array<object>> {
    return this.documentVersionsService.findVersionsByDocument(+request.user.userId, +id);
  }

  /**
   * Finds document versions by user ID.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - User ID
   * @returns {Promise<Array<object>>} - A promise that resolves to an array of document version objects.
   */
  @Get('user/:id')
  findByUser(@Request() request, @Param('id') id: string): Promise<Array<object>> {
    return this.documentVersionsService.findVersionsByUser(+request.user.userId, +id);
  }

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
