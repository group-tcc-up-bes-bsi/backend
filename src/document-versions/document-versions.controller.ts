import {
  Controller,
  //Get,
  Post,
  Body,
  //Patch,
  //Param,
  //Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { DocumentVersionsService } from './document-versions.service';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
//import { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDocumentVersionDto: UpdateDocumentVersionDto) {
    return this.documentVersionsService.update(+id, updateDocumentVersionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentVersionsService.remove(+id);
  }

  */
}
