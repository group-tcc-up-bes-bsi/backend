/* eslint-disable jsdoc/require-jsdoc */
import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentVersionDto } from './create-document-version.dto';

export class UpdateDocumentVersionDto extends PartialType(CreateDocumentVersionDto) {}
