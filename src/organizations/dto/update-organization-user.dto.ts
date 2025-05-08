import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserType } from '../entities/organization-user.entity';

/**
 * Data Transfer Object for updating a organization-user.
 */
export class UpdateOrganizationUserDto {
  @IsOptional()
  @IsString()
  organizationName: string;

  @IsOptional()
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsNumber()
  organizationId: number;

  @IsOptional()
  @IsEnum(UserType)
  userType: UserType;

  @IsOptional()
  @IsBoolean()
  inviteAccepted: boolean;
}
