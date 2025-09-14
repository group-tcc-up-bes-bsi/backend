import { IsString } from 'class-validator';

/**
 * Data Transfer Object for updating a document version.
 */
export class UpdateDocumentVersionDto {
  @IsString()
  name: string;
}
