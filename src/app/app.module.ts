import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

globalThis.crypto = {
  randomUUID: () => crypto.randomUUID(),
} as Crypto;

// This is the main module, all of the controllers and services are imported here.
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
      }),
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
