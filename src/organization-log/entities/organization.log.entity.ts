import { OrganizationEntity } from 'src/organizations/entities/organizations.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

/**
 * Represents an organization log entity in the database.
 */
@Entity('organization_logs')
export class OrganizationLogEntity {
    @PrimaryGeneratedColumn()
    logId: number;

    @Column()
    description: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @ManyToOne(() => OrganizationEntity, (organization) => organization.logs)
    organization: OrganizationEntity;
}
