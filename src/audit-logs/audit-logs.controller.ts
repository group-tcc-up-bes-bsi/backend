import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuthGuard } from 'src/auth/guards/auth.guards';

/**
 * Audit logs controller.
 */
@UseGuards(AuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  /**
   * Constructor.
   * @param {AuditLogsService} auditLogsService - Audit logs service.
   */
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * Finds Audit logs by document ID.
   * @param {Request} request - The request object containing user information.
   * @param {string} id - Document ID
   * @returns {Promise<Array<object>>} - A promise that resolves to an array of Audit log objects.
   */
  @Get('document/:id')
  findByDocument(@Request() request, @Param('id') id: string): Promise<Array<object>> {
    return this.auditLogsService.findAuditLogsByDocument(+request.user.userId, +id);
  }
}
