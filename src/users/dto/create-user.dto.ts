import { IsString } from 'class-validator';

/**
 * Data Transfer Object for creating a user.
 */
export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}
