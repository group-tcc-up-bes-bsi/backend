import { IsNumber, IsString } from 'class-validator';

/**
 * Data Transfer Object for creating a document version.
 */
export class CreateDocumentVersionDto {
  @IsString()
  name: string;

  @IsNumber()
  documentId: number;
}
