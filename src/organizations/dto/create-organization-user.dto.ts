import { IsEnum, IsNumber } from 'class-validator';
import { UserType } from '../entities/organization-user.entity';

/**
 * Data Transfer Object for adding a user to the organization.
 * Only the organization owners can add users to the organization.
 */
export class CreateOrganizationUserDto {
  @IsNumber()
  organizationId: number;

  @IsNumber()
  userId: number;

  @IsEnum(UserType)
  userType: UserType;
}
