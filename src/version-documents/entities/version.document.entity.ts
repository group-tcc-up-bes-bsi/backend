import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DocumentEntity } from 'src/documents/entities/document.entity';
import { UserEntity } from 'src/users/entities/user.entity';

/**
 * Represents a version of a document in the database.
 */
@Entity('version_documents')
export class VersionDocumentEntity {
    @PrimaryGeneratedColumn()
    versionId: number;

    @Column()
    versionName: string; // Nome da versão (pode ser um número, data, ou qualquer outro identificador)

    @Column()
    versionDescription: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @ManyToOne(() => DocumentEntity, (document) => document.versionDocuments)
    @JoinColumn({ name: 'documentId' })
    document: DocumentEntity;

    @ManyToOne(() => UserEntity, (user) => user.versionDocuments)
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
