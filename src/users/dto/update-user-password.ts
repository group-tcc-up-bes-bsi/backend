import { IsString } from 'class-validator';

/**
 * Data Transfer Object for updating a user.
 */
export class UpdateUserPasswordDto {
  @IsString()
  password?: string;

  @IsString()
  adminPass?: string;
}
