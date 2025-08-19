import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrganizationType } from '../entities/organization.entity';
/**
 * Data Transfer Object for updating a organization.
 */
export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType: OrganizationType;
}
