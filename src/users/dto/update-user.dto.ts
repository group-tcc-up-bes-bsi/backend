import { IsOptional, IsString } from 'class-validator';

/**
 * Data Transfer Object for updating a user.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
