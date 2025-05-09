import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { DocumentEntity } from 'src/documents/entities/document.entity';
import { UserEntity } from 'src/users/entities/user.entity';

/**
 * Represents a recycle bin log for deleted documents in the database.
 */
@Entity('recycle_bins')
export class RecycleBinEntity {
    @PrimaryGeneratedColumn()
    recycleBinId: number;

    @ManyToOne(() => DocumentEntity, (document) => document.recycleBins, { eager: true })
    @JoinColumn({ name: 'documentId' }) // Foreign key column for documents
    document: DocumentEntity;

    @ManyToOne(() => UserEntity, (user) => user.recycleBins, { eager: true })
    @JoinColumn({ name: 'userId' }) // Foreign key column for users
    user: UserEntity;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    deletedAt: Date;

    @Column()
    reason: string; // Reason for deletion (optional)
}
