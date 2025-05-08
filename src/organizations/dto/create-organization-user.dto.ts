import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { UserType } from '../../organizations/entities/organization-user.entity';

/**
 * Data Transfer Object for creating a organization user.
 */
export class CreateOrganizationUserDto {
  @IsString()
  organizationName: string;

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
