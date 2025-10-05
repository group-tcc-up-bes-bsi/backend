import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * AuditLog entity.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  auditLogId: number;

  @Column()
  action: string;

  @Column()
  message: string;

  @Column()
  userId: number;

  @Column()
  documentId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
