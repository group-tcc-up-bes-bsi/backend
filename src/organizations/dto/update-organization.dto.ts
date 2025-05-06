import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';

/**
 * Data Transfer Object for updating a organization.
 * Extends the CreateOrganizationDto to allow partial updates.
 * PartialType is used to make all properties optional.
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
