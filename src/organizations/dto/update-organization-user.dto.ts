import { IsBoolean, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { UserType } from '../entities/organization-user.entity';

/**
 * Data Transfer Object for updating a organization-user.
 */
export class UpdateOrganizationUserDto {
  @IsNumber()
  organizationId: number;

  @IsNumber()
  userId: number;

  @IsOptional()
  @IsEnum(UserType)
  userType: UserType;

  @IsOptional()
  @IsBoolean()
  inviteAccepted: boolean;
}
