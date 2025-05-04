import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Data Transfer Object for creating a document.
 */
export class CreateDocumentDto {
  @IsString()
  documentName: string;

  @IsString()
  documentType: string;

  @IsString()
  documentDescription: string;

  @IsOptional()
  @IsNumber()
  userId: number;
}
