import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guards';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Authenticate the user.
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() input: { username: string; password: string }) {
    return this.authService.login(input);
  }

  // Verify if the user is already authenticated.
  @UseGuards(AuthGuard)
  @Get('me')
  getUserInfo(@Request() request) {
    // Returning the updated request.user, with auth token, from Guard.
    return request.user;
  }
}
