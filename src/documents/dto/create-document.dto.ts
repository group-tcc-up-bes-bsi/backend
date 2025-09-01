import { IsNumber, IsString } from 'class-validator';

/**
 * Data Transfer Object for creating a document.
 */
export class CreateDocumentDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  description: string;

  @IsNumber()
  organizationId: number;
}
