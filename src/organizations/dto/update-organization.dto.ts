import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { OrganizationType } from '../entities/organizations.entity';
/**
 * Data Transfer Object for updating a organization.
 */
export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  organizationDescription?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  @IsOptional()
  @IsNumber()
  userCreatedId?: number;
}
