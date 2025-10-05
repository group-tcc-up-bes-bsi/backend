import { Module, forwardRef } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLog } from './entities/audit-log.entity';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsModule } from 'src/organizations/organizations.module';

/**
 * Audit Logs module.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), forwardRef(() => AuthModule), forwardRef(() => OrganizationsModule)],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
