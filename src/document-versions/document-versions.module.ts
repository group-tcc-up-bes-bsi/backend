/* eslint-disable jsdoc/require-jsdoc */
import { Module } from '@nestjs/common';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentVersionsController } from './document-versions.controller';

@Module({
  controllers: [DocumentVersionsController],
  providers: [DocumentVersionsService],
})
export class DocumentVersionsModule {}
