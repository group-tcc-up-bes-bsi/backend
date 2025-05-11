import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentEntity } from './entities/document.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';

/**
 * Service for managing documents.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  /**
   * Creates an instance of DocumentsService.
   * @param {Repository<DocumentEntity>} documentsRepo - The repository for document entities.
   * @param {UsersService} usersService - The service for managing users.
   */
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentsRepo: Repository<DocumentEntity>,
    private usersService: UsersService,
  ) {}

  /**
   * Creates a new document.
   * @param {CreateDocumentDto} createDocumentDto - The data transfer object containing document details.
   * @returns {object} - Object containing message and documentId.
   * @throws {NotFoundException} - If the user is not found.
   * @throws {Error} - If an error occurs during the save process.
   */
  async create(createDocumentDto: CreateDocumentDto) {
    const { userId, ...rest } = createDocumentDto;

    const user = await this.usersService.findOne(userId);

    if (!user) {
      this.logger.error(`User with ID ${userId} was not found.`);
      return new NotFoundException('User was not found');
    }

    return this.documentsRepo
      .save(this.documentsRepo.create({ ...rest, owner: user }))
      .then(({ documentId }) => {
        this.logger.log(`Document Id ${documentId} saved successfully`);
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
   * Retrieves all documents.
   * @returns {Promise<[]>} - A promise that resolves to an array of document objects.
   */
  findAll() {
    return this.documentsRepo.find().then((documents) => {
      return documents.map((document) => ({
        ...document,
        owner: document.owner?.userId,
      }));
    });
  }

  /**
   * Retrieves a document by its ID.
   * @param {number} documentId - The ID of the document to retrieve.
   * @returns {object} - Document object.
   * @throws {NotFoundException} - If the document is not found.
   */
  async findOne(documentId: number) {
    const document = await this.documentsRepo.findOneBy({ documentId });

    if (!document) {
      this.logger.warn(`Document with ID ${documentId} not found`);
      throw new NotFoundException('Document not found');
    }

    return {
      ...document,
      owner: document.owner?.userId,
    };
  }

  /**
   * Updates a document by its ID.
   * @param {number} documentId - The ID of the document to update.
   * @param {UpdateDocumentDto} updateDocumentDto - The data transfer object containing updated document details.
   * @returns {Promise<string>} - A promise that resolves to a message indicating the action performed.
   * @throws {BadRequestException} - If no data is provided for update.
   * @throws {NotFoundException} - If the document is not found.
   * @throws {Error} - If an error occurs during the update process.
   */
  update(documentId: number, updateDocumentDto: UpdateDocumentDto) {
    if (Object.keys(updateDocumentDto).length === 0) {
      this.logger.warn(`No data provided for update documentId ${documentId}`);
      throw new BadRequestException('No data provided for update');
    }

    return this.documentsRepo
      .update(documentId, updateDocumentDto)
      .then((result) => {
        if (result.affected > 0) {
          this.logger.log(`Document with ID ${documentId} successfully updated`);
          return 'Document successfully updated';
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
   * Removes a document by its ID.
   * @param {number} documentId - The ID of the document to remove.
   * @returns {Promise<string>} - A promise that resolves to a message indicating the action performed.
   * @throws {NotFoundException} - If the document is not found.
   * @throws {Error} - If an error occurs during the removal process.
   */
  async remove(documentId: number) {
    const document = await this.documentsRepo.findOneBy({ documentId });
    if (document) {
      return this.documentsRepo
        .remove(document)
        .then(() => {
          this.logger.log(`Document with ID ${documentId} successfully removed`);
          return 'Document successfully removed';
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
}
