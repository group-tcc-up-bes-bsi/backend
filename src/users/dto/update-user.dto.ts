import { IsEmail, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsEmail()
  email?: string;
}
