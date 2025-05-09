import { OrganizationEntity } from 'src/organizations/entities/organizations.entity';
import { DocumentEntity } from 'src/documents/entities/document.entity';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Represents a dashboard entity in the database.
 */
@Entity('dashboards')
export class DashboardEntity {
    @PrimaryGeneratedColumn()
    dashboardId: number;

    @Column('json')
    organizations: any;

    @Column('json')
    recentDocuments: any;

    @Column('json')
    indicators: any;
}
