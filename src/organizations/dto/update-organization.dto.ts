import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';

/**
 * Data Transfer Object for updating a organization.
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
