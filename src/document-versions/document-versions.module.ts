import { forwardRef, Module } from '@nestjs/common';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentVersionsController } from './document-versions.controller';
import { DocumentVersion } from './entities/document-version.entity';
import { AuthModule } from 'src/auth/auth.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';

/**
 * Module for managing document versions.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentVersion]),
    forwardRef(() => AuthModule),
    forwardRef(() => DocumentsModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => AuditLogsModule),
  ],
  controllers: [DocumentVersionsController],
  providers: [DocumentVersionsService],
})
export class DocumentVersionsModule {}
