import { IsOptional, IsString } from 'class-validator';

/**
 * Data Transfer Object for updating a document.
 */
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  description: string;
}
