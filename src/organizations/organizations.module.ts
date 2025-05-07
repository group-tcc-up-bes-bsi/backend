import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationEntity } from './entities/organizations.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';

/**
 * Module for managing organizations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationEntity]),
    AuthModule,
    UsersModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
