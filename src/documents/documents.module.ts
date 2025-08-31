import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { AuthModule } from 'src/auth/auth.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';

/**
 * Module for managing documents.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Document]), AuthModule, OrganizationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
