import { Module, ValidationPipe } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { APP_PIPE } from '@nestjs/core';
import { DocumentsModule } from 'src/documents/documents.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { DocumentVersionsModule } from 'src/document-versions/document-versions.module';

globalThis.crypto = {
  randomUUID: () => crypto.randomUUID(),
} as Crypto;

/**
 * Main application module.
 * This module imports and configures the necessary modules for the application.
 */
@Module({
  imports: [
    // Import and configure the NestJs configuration module.
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Import and configure the TypeORM module, used to connect with the DB.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT'), 10),
        database: config.get('DB_DATABASE'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'], // Imports dinamically all entities.
        autoLoadEntities: true,
        synchronize: true, // FIXME: Set to false in production
        timezone: 'Z',
      }),
    }),
    UsersModule,
    AuthModule,
    DocumentsModule,
    OrganizationsModule,
    DocumentVersionsModule,
  ],
  providers: [
    {
      // Global validation pipe, to validate incoming requests.
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
    },
  ],
})
export class AppModule {}
