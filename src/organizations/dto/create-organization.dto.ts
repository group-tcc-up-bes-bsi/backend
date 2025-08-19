import { IsEnum, IsString } from 'class-validator';
import { OrganizationType } from '../entities/organization.entity';
/**
 * Data Transfer Object for creating a organization.
 */
export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;
}
