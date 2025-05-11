import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserType } from '../entities/organization-user.entity';

/**
 * Data Transfer Object for updating a organization-user.
 */
export class UpdateOrganizationUserDto {
  @IsOptional()
  @IsEnum(UserType)
  userType: UserType; // TODO: Only organization owner must change this field.

  @IsOptional()
  @IsBoolean()
  inviteAccepted: boolean;
}

// Maybe two different endpoints:
//  1. Change user type.
//  2. Change inviteAccepted status.
