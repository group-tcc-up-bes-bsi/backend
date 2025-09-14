import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import { DocumentVersion } from './entities/document-version.entity';
import { Repository } from 'typeorm';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { InjectRepository } from '@nestjs/typeorm';
import { UserType } from 'src/organizations/entities/organization-user.entity';
import { DocumentsService } from 'src/documents/documents.service';
import { File } from 'multer';
import { writeFileSync } from 'fs';

/**
 * Service for managing document versions.
 */
@Injectable()
export class DocumentVersionsService {
  private readonly logger = new Logger(DocumentVersionsService.name);

  /**
   * Creates an instance of DocumentVersionsService.
   * @param {Repository<DocumentVersion>} docVersionsRepo - The repository for document version entities.
   * @param {OrganizationsService} organizationsService - The service for managing organizations.
   * @param {DocumentsService} documentsService - The service for managing documents.
   */
  constructor(
    @InjectRepository(DocumentVersion)
    private readonly docVersionsRepo: Repository<DocumentVersion>,
    private organizationsService: OrganizationsService,
    private documentsService: DocumentsService,
  ) {}

  ///////////////////////////////////////////////////////////////////////
  // Private functions
  ///////////////////////////////////////////////////////////////////////

  /**
   * Check if user has read permission in the organization.
   * @param {number} userId - User ID.
   * @param {number} documentId - Document ID.
   * @throws {ForbiddenException} - If the user is not Reader, Writer or Owner.
   */
  private async checkReadPermission(userId: number, documentId: number): Promise<void> {
    const organizationId = await this.documentsService.getOrganizationId(documentId);
    const roleArray = [UserType.OWNER, UserType.WRITE, UserType.READ];
    const hasPermission = await this.organizationsService.checkUserRole(userId, organizationId, roleArray);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have read permissions in this organization');
    }
  }

  /**
   * Check if user has edit permission in the organization.
   * @param {number} userId - User ID.
   * @param {number} documentId - Document ID.
   * @throws {ForbiddenException} - If the user is not Writer or Owner.
   */
  private async checkEditPermission(userId: number, documentId: number): Promise<void> {
    const organizationId = await this.documentsService.getOrganizationId(documentId);
    const roleArray = [UserType.OWNER, UserType.WRITE];
    const hasPermission = await this.organizationsService.checkUserRole(userId, organizationId, roleArray);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have edit permissions in this organization');
    }
  }

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
      throw new ForbiddenException('You do not have owner permissions in this organization');
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Public interfaces
  ///////////////////////////////////////////////////////////////////////

  /**
   * Creates a new document version.
   * @param {number} requestUserId - ID of the user making the request.
   * @param {CreateDocumentVersionDto} dto - DocumentVersion data transfer object.
   * @param {File} file - The uploaded file.
   * @returns {Promise<{}>} - A promise that resolves when the document version object is created.
   */
  async create(requestUserId: number, dto: CreateDocumentVersionDto, file: File): Promise<object> {
    await this.checkEditPermission(requestUserId, dto.documentId);

    // Check if a version with the same name already exists for the document.
    await this.docVersionsRepo
      .findOne({
        where: { documentId: dto.documentId, name: dto.name },
      })
      .then((docVersion) => {
        if (docVersion) {
          throw new BadRequestException('A version with this name already exists for this document');
        }
      });

    // 3. Salva manualmente no disco
    writeFileSync('/home/joao/teste/doc.txt', file.buffer);

    return this.docVersionsRepo
      .save(
        this.docVersionsRepo.create({
          name: dto.name,
          filePath: 'fakePath',
          documentId: dto.documentId,
          userId: requestUserId,
        }),
      )
      .then(({ documentVersionId }) => {
        this.logger.debug(`Document Version Id ${documentVersionId} saved successfully`);
        return {
          message: 'Document Version successfully created',
          documentVersionId,
        };
      })
      .catch((error) => {
        this.logger.error(`Error saving document version: ${error}`);
        throw new Error('Error saving document version');
      });
  }

  /**
   * Find the document version by id.
   * @param {number} requestUserId - ID of the user making the request.
   * @param {number} documentVersionId - ID of the document version to find.
   * @returns {Promise<DocumentVersion>} - A promise that resolves to the DocumentVersion entity.
   */
  findOne(requestUserId: number, documentVersionId: number): Promise<DocumentVersion> {
    return this.docVersionsRepo.findOneBy({ documentVersionId }).then(async (docVersion) => {
      if (docVersion) {
        await this.checkReadPermission(requestUserId, docVersion.documentId);
        return docVersion;
      } else {
        this.logger.log(`Document version with ID ${documentVersionId} not found`);
        throw new NotFoundException('Document Version not found');
      }
    });
  }

  /**
   * Find all document versions for a specific document.
   * @param {number} requestUserId - ID of the user making the request.
   * @param {number} documentId - ID of the document to find.
   * @returns {Promise<DocumentVersion[]>} - A promise that resolves to an array of DocumentVersion entities.
   */
  async findVersionsByDocument(requestUserId: number, documentId: number): Promise<DocumentVersion[]> {
    await this.checkReadPermission(requestUserId, documentId);
    return this.docVersionsRepo.findBy({ documentId }).then((docVersions) => {
      if (docVersions.length === 0) {
        this.logger.log(`No document versions found for document ID ${documentId}`);
        throw new NotFoundException('No Document Versions found for this document');
      }
      return docVersions;
    });
  }

  /**
   * Find all document versions created by a specific user.
   * @param {number} requestUserId - ID of the user making the request.
   * @param {number} userId - ID of the user to find.
   * @returns {Promise<DocumentVersion[]>} - A promise that resolves to an array of DocumentVersion entities.
   */
  async findVersionsByUser(requestUserId: number, userId: number): Promise<DocumentVersion[]> {
    if (requestUserId !== userId) {
      throw new ForbiddenException('You can only view your own document versions');
    }
    return this.docVersionsRepo.findBy({ userId }).then((docVersions) => {
      if (docVersions.length === 0) {
        this.logger.log(`No document versions found for user ID ${userId}`);
        throw new NotFoundException('No Document Versions found for this user');
      }
      return docVersions;
    });
  }

  /**
   * Updates a document version.
   * @param {number} requestUserId - ID of the user making the request.
   * @param {number} documentVersionId - ID of the document version to update.
   * @param {UpdateDocumentVersionDto} dto - DocumentVersion data transfer object.
   * @returns {Promise<object>} - A promise that resolves when the document version object is updated.
   */
  async update(requestUserId: number, documentVersionId: number, dto: UpdateDocumentVersionDto): Promise<object> {
    const docVersion = await this.docVersionsRepo.findOneBy({ documentVersionId });

    if (!docVersion) {
      this.logger.warn(`Document version with ID ${documentVersionId} not found for update`);
      throw new NotFoundException('Document Version not found');
    }

    await this.checkEditPermission(requestUserId, docVersion.documentId);

    return this.docVersionsRepo
      .update(documentVersionId, dto)
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(`Document with ID ${documentVersionId} successfully updated`);
          return {
            message: 'Document Version successfully updated',
            documentVersionId,
          };
        }
      })
      .catch((error) => {
        this.logger.error(`Error updating document version: ${error}`);
        throw new Error('Error updating document version');
      });
  }

  /**
   * Removes a document version.
   * @param {number} requestUserId - ID of the user making the request.
   * @param {number} documentVersionId - ID of the document version to remove.
   * @returns {Promise<object>} - A promise that resolves when the document version is removed.
   */
  async remove(requestUserId: number, documentVersionId: number): Promise<object> {
    const docVersion = await this.docVersionsRepo.findOneBy({ documentVersionId });
    if (docVersion) {
      await this.checkOwnerPermission(requestUserId, docVersion.documentId);
      return this.docVersionsRepo
        .remove(docVersion)
        .then(() => {
          this.logger.log(`Document version with ID ${documentVersionId} successfully removed`);
          return {
            message: 'Document Version successfully removed',
            documentVersionId,
          };
        })
        .catch((e) => {
          this.logger.error(`Error removing document version with ID ${documentVersionId}`, e.stack);
          throw new Error('Error deleting document version');
        });
    } else {
      this.logger.warn(`Document version with ID ${documentVersionId} not found for removal`);
      throw new NotFoundException('Document Version not found');
    }
  }
}
