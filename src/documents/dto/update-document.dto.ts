import { IsOptional, IsString } from 'class-validator';

/**
 * Data Transfer Object for updating a document.
 */
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  documentName: string;

  @IsOptional()
  @IsString()
  documentType: string;

  @IsOptional()
  @IsString()
  documentDescription: string;
}
