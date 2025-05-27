import { IsEnum, IsString } from 'class-validator';
import { OrganizationType } from '../entities/organization.entity';
/**
 * Data Transfer Object for creating a organization.
 */
export class CreateOrganizationDto {
  @IsString()
  organizationName: string;

  @IsString()
  organizationDescription: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;
}
