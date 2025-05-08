import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationEntity } from './entities/organization.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { OrganizationUserEntity } from 'src/organizations/entities/organization-user.entity';

/**
 * Module for managing organizations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationEntity, OrganizationUserEntity]),
    AuthModule,
    UsersModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
