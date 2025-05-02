import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersEntity } from './entity/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { AuthModule } from 'src/auth/auth.module';

/**
 * Module for managing users.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UsersEntity]),
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
