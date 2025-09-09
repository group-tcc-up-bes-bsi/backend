import { IsNumber, IsString } from 'class-validator';

/* eslint-disable jsdoc/require-jsdoc */
export class CreateDocumentVersionDto {
  @IsString()
  name: string;

  @IsNumber()
  documentId: number;
}
