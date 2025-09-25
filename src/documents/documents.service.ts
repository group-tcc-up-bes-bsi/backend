import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { Repository } from 'typeorm';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { UserType } from 'src/organizations/entities/organization-user.entity';

/**
 * Service for managing documents.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  /**
   * Creates an instance of DocumentsService.
   * @param {Repository<Document>} documentsRepo - The repository for document entities.
   * @param {OrganizationsService} organizationsService - The service for managing users.
   */
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    private organizationsService: OrganizationsService,
  ) {}

  ///////////////////////////////////////////////////////////////////////
  // Private functions
  ///////////////////////////////////////////////////////////////////////

  /**
   * Check if user has read permission in the organization.
   * @param {number} userId - User ID.
   * @param {number} organizationId - Organization ID.
   * @throws {ForbiddenException} - If the user is not Reader, Writer or Owner.
   */
  private async checkReadPermission(userId: number, organizationId: number): Promise<void> {
    const roleArray = [UserType.OWNER, UserType.WRITE, UserType.READ];
    const hasPermission = await this.organizationsService.checkUserRole(userId, organizationId, roleArray);
    if (!hasPermission) {
      throw new ForbiddenException('You are not part of the organization');
    }
  }

  /**
   * Check if user has edit permission in the organization.
   * @param {number} userId - User ID.
   * @param {number} organizationId - Organization ID.
   * @throws {ForbiddenException} - If the user is not Writer or Owner.
   */
  private async checkEditPermission(userId: number, organizationId: number): Promise<void> {
    const roleArray = [UserType.OWNER, UserType.WRITE];
    const hasPermission = await this.organizationsService.checkUserRole(userId, organizationId, roleArray);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have edit permissions in this organization');
    }
  }

  /**
   * Check if user has delete permission in the organization.
   * @param {number} userId - User ID.
   * @param {number} organizationId - Organization ID.
   * @throws {ForbiddenException} - If the user is not Writer or Owner.
   */
  private async checkOwnerPermission(userId: number, organizationId: number): Promise<void> {
    const hasPermission = await this.organizationsService.checkUserRole(userId, organizationId, [UserType.OWNER]);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have owner permissions in this organization');
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Public interfaces
  ///////////////////////////////////////////////////////////////////////

  /**
   * Get Organization ID based on Document ID.
   * @param {number} documentId - Document ID.
   * @returns {number} - Organization ID.
   */
  getOrganizationId(documentId: number): Promise<number> {
    return this.documentsRepo
      .findOneBy({ documentId })
      .then((document) => {
        if (!document) {
          throw new NotFoundException('Document not found');
        }
        return +document.organizationId;
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(`Error retrieving document ${documentId}`, e.stack);
        throw new Error('Error retrieving document');
      });
  }

  /**
   * Creates a new document.
   * Only users with edit permissions can create documents.
   * @param {number} requestUserId - The ID of the user making the request.
   * @param {CreateDocumentDto} dto - The data transfer object.
   * @returns {Promise<object>} - Object containing message and documentId.
   * @throws {Error} - If an error occurs during the save process.
   */
  async createDocument(requestUserId: number, dto: CreateDocumentDto) {
    await this.checkEditPermission(requestUserId, dto.organizationId);
    return this.documentsRepo
      .save(this.documentsRepo.create(dto))
      .then(({ documentId }) => {
        this.logger.debug(`Document Id ${documentId} saved successfully`);
        return {
          message: 'Document successfully created',
          documentId,
        };
      })
      .catch((error) => {
        this.logger.error(`Error saving document: ${error}`);
        throw new Error('Error saving document');
      });
  }

  /**
   * Updates a document by its ID.
   * @param {number} requestUserId - The ID of the user making the request.
   * @param {number} documentId - The ID of the document to update.
   * @param {UpdateDocumentDto} dto - The data transfer object containing updated document details.
   * @returns {Promise<string>} - A promise that resolves to a message indicating the action performed.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the document is not found.
   * @throws {Error} - If an error occurs during the update process.
   */
  async update(requestUserId: number, documentId: number, dto: UpdateDocumentDto) {
    await this.checkEditPermission(requestUserId, await this.getOrganizationId(documentId));

    if (Object.keys(dto).length === 0) {
      this.logger.debug(`No data provided for update documentId ${documentId}`);
      throw new BadRequestException('No data provided for update');
    }

    return this.documentsRepo
      .update(documentId, dto)
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(`Document with ID ${documentId} successfully updated`);
          return {
            message: 'Document successfully updated',
            documentId,
          };
        } else {
          this.logger.warn(`No document found with ID ${documentId} to update`);
          throw new NotFoundException('Document not found');
        }
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(`Error updating document with ID ${documentId}`, e.stack);
        throw new Error('Error updating user');
      });
  }

  /**
   * Updates the last modified date and active version ID of a document.
   * This should not be called directly by controllers.
   * @param {number} documentId - The ID of the document to update.
   * @param {number} documentVersionId - The ID of the document version to set as active.
   * @returns {Promise<boolean>} A promise that resolves to true if the update was successful.
   */
  updateLastModifiedDate(documentId: number, documentVersionId: number): Promise<boolean> {
    return this.documentsRepo
      .update(documentId, { lastModifiedDate: new Date(), activeVersionId: documentVersionId })
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(`Document with ID ${documentId} lastModifiedDate successfully updated`);
          return true;
        } else {
          this.logger.warn(`No document found with ID ${documentId} to update lastModifiedDate`);
          throw new NotFoundException('Document not found');
        }
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(`Error updating last modified date for document ${documentId}`, e.stack);
        throw new Error('Error updating document');
      });
  }

  /**
   * Updates the active version ID of a document.
   * Only users with edit permissions can update the active version ID.
   * @param {number} requestUserId - The ID of the user making the request.
   * @param {number} documentId - The ID of the document to update.
   * @param {number} documentVersionId - The ID of the document version to set as active.
   * @returns {Promise<object>} - A promise that resolves to an object containing a message and the document ID.
   */
  async updateActiveVersionId(requestUserId: number, documentId: number, documentVersionId: number): Promise<object> {
    await this.checkEditPermission(requestUserId, await this.getOrganizationId(documentId));
    return this.documentsRepo
      .update(documentId, { activeVersionId: documentVersionId })
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(`Document with ID ${documentId} activeVersionId successfully updated`);
          return {
            message: 'Document active version successfully updated',
            documentId,
          };
        } else {
          this.logger.warn(`No document found with ID ${documentId} to update activeVersionId`);
          throw new NotFoundException('Document not found');
        }
      })
      .catch((e) => {
        if (e.name === 'NotFoundException') {
          throw e;
        }
        this.logger.error(`Error updating active version ID for document ${documentId}`, e.stack);
        throw new Error('Error updating document');
      });
  }

  /**
   * Removes a document by its ID.
   * @param {number} requestUserId - The ID of the user making the request.
   * @param {number} documentId - The ID of the document to remove.
   * @returns {Promise<string>} - A promise that resolves to a message indicating the action performed.
   * @throws {NotFoundException} - If the document is not found.
   * @throws {Error} - If an error occurs during the removal process.
   */
  async remove(requestUserId: number, documentId: number) {
    await this.checkOwnerPermission(requestUserId, await this.getOrganizationId(documentId));
    const document = await this.documentsRepo.findOneBy({ documentId });
    if (document) {
      return this.documentsRepo
        .remove(document)
        .then(() => {
          this.logger.log(`Document with ID ${documentId} successfully removed`);
          return {
            message: 'Document successfully removed',
            documentId,
          };
        })
        .catch((e) => {
          this.logger.error(`Error removing document with ID ${documentId}`, e.stack);
          throw new Error('Error deleting document');
        });
    } else {
      this.logger.warn(`Document with ID ${documentId} not found for removal`);
      throw new NotFoundException('Document not found');
    }
  }

  /**
   * Retrieves all organization documents.
   * @param {number} requestUserId - The ID of the user making the request.
   * @param {number} organizationId - Organization ID.
   * @throws {NotFoundException} - If there is no documents for this organization.
   * @returns {Promise<[]>} - A promise that resolves to an array of document objects.
   */
  async findAllByOrganization(requestUserId: number, organizationId: number) {
    await this.checkReadPermission(requestUserId, organizationId);
    const documents = await this.documentsRepo.findBy({ organizationId });

    if (!documents || documents.length === 0) {
      throw new NotFoundException('No documents found for this organization');
    }
    return documents;
  }

  /**
   * Retrieves a document by its ID.
   * @param {number} requestUserId - The ID of the user making the request.
   * @param {number} documentId - The ID of the document to retrieve.
   * @returns {Promise<object>} - Document object.
   * @throws {NotFoundException} - If the document is not found.
   */
  async findOne(requestUserId: number, documentId: number) {
    await this.checkReadPermission(requestUserId, await this.getOrganizationId(documentId));
    const document = await this.documentsRepo.findOneBy({ documentId });

    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }
}
