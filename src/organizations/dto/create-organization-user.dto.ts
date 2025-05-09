import { IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { UserType } from '../../organizations/entities/organization-user.entity';

/**
 * Data Transfer Object for creating a organization user.
 */
export class CreateOrganizationUserDto {
  @IsOptional()
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsNumber()
  organizationId: number;

  @IsEnum(UserType)
  userType: UserType;

  @IsBoolean()
  inviteAccepted: boolean;
}
