import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
//import { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import { DocumentVersion } from './entities/document-version.entity';
import { Repository } from 'typeorm';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { InjectRepository } from '@nestjs/typeorm';
import { UserType } from 'src/organizations/entities/organization-user.entity';
import { DocumentsService } from 'src/documents/documents.service';

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

  ///////////////////////////////////////////////////////////////////////
  // Public interfaces
  ///////////////////////////////////////////////////////////////////////

  /**
   * Creates a new document version.
   * @param {number} requestUserId - ID of the user making the request.
   * @param {CreateDocumentVersionDto} dto - DocumentVersion data transfer object.
   * @returns {Promise<{}>} - A promise that resolves when the document version object is created.
   */
  async create(requestUserId: number, dto: CreateDocumentVersionDto): Promise<object> {
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

  /*
  findAll() {
    return `This action returns all documentVersions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} documentVersion`;
  }

  update(id: number, updateDocumentVersionDto: UpdateDocumentVersionDto) {
    return `This action updates a #${id} documentVersion`;
  }

  remove(id: number) {
    return `This action removes a #${id} documentVersion`;
  }
  */
}
