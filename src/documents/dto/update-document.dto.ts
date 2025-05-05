import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-document.dto';

/**
 * Data Transfer Object for updating a document.
 * Extends the CreateDocumentDto to allow partial updates.
 * PartialType is used to make all properties optional.
 */
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
