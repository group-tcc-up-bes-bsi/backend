import { ForbiddenException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { UserType } from 'src/organizations/entities/organization-user.entity';
import { DocumentsService } from 'src/documents/documents.service';

type Action =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'TRASHED'
  | 'RESTORED'
  | 'CREATED_VERSION'
  | 'UPDATED_VERSION'
  | 'DELETED_VERSION';

/**
 * Service for managing Audit Logs.
 */
@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  /**
   * Constructor for AuditLogsService.
   * @param {Repository<AuditLog>} auditLogsRepo - AuditLog repository.
   * @param {OrganizationsService} organizationsService - Organizations service.
   * @param {DocumentsService} documentsService - Documents service.
   */
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepo: Repository<AuditLog>,
    private organizationsService: OrganizationsService,
    @Inject(forwardRef(() => DocumentsService))
    private documentsService: DocumentsService,
  ) {}

  /**
   * Check if user has owner permission in the organization.
   * @param {number} userId - User ID.
   * @param {number} documentId - Document ID.
   * @throws {ForbiddenException} - If the user is not Owner.
   */
  private async checkOwnerPermission(userId: number, documentId: number): Promise<void> {
    const organizationId = await this.documentsService.getOrganizationId(documentId);
    const hasPermission = await this.organizationsService.checkUserRole(userId, organizationId, [UserType.OWNER]);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permissions to see the Audit logs');
    }
  }

  /**
   * Creates an Audit log.
   * @param {Action} action - User action (CREATED, UPDATED, DELETED, ...).
   * @param {number} userId - User Id.
   * @param {number} documentId - Document Id.
   * @returns {Promise<void>} - Returns a promise resolved after the database action.
   */
  async createAuditLog(action: Action, userId: number, documentId: number): Promise<void> {
    await this.auditLogsRepo
      .save(
        this.auditLogsRepo.create({
          action,
          userId,
          documentId,
          message: `Document ${documentId} was ${action} by User ${userId}`,
        }),
      )
      .catch((error) => {
        this.logger.error(`Error saving Audit log: ${error}`);
      });
  }

  /**
   * Find Audit logs by organzation.
   * @param {number} requestUserId - ID of the user making the request.
   * @param {number} documentId - Document ID to search.
   * @returns {Promise<AuditLog[]>} - Promise that resolves with the Audit logs.
   */
  async findAuditLogsByDocument(requestUserId: number, documentId: number): Promise<AuditLog[]> {
    await this.checkOwnerPermission(requestUserId, documentId);
    return this.auditLogsRepo.findBy({ documentId }).then((auditLogs) => {
      if (auditLogs.length === 0) {
        this.logger.log(`No audit logs found for document ID ${documentId}`);
        throw new NotFoundException('No Audit Logs found for this document');
      }
      return auditLogs;
    });
  }
}
