import { DocumentEntity } from 'src/documents/entities/document.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

/**
 * Represents a document log entity in the database.
 */
@Entity('document_logs')
export class DocumentLogEntity {
    @PrimaryGeneratedColumn()
    logId: number;

    @Column()
    description: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @ManyToOne(() => DocumentEntity, (document) => document.documentLogs)
    document: DocumentEntity;

    @ManyToOne(() => UserEntity, (user) => user.documentLogs)
    user: UserEntity;

}
