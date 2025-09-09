import { Module } from '@nestjs/common';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentVersionsController } from './document-versions.controller';
import { DocumentVersion } from './entities/document-version.entity';
import { AuthModule } from 'src/auth/auth.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Module for managing document versions.
 */
@Module({
  imports: [TypeOrmModule.forFeature([DocumentVersion]), AuthModule, DocumentsModule],
  controllers: [DocumentVersionsController],
  providers: [DocumentVersionsService],
})
export class DocumentVersionsModule {}
