import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DocumentVersionsService } from './document-versions.service';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import { AuthGuard } from 'src/auth/guards/auth.guards';

@UseGuards(AuthGuard)
@Controller('document-versions')
export class DocumentVersionsController {
  constructor(private readonly documentVersionsService: DocumentVersionsService) {}

  @Post()
  create(@Body() createDocumentVersionDto: CreateDocumentVersionDto) {
    return this.documentVersionsService.create(createDocumentVersionDto);
  }

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
}
