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

/**
 * Controller responsible for handling authentication-related requests.
 */
@Controller('auth')
export class AuthController {
  /**
   * Class constructor.
   * @param {AuthService} authService - The authentication service instance.
   */
  constructor(private authService: AuthService) {}

  /**
   * Handles user login requests.
   * @param {object} input - The login credentials.
   * @param {string} input.email - The user's email address.
   * @param {string} input.password - The user's password.
   * @returns {Promise<object>} The authentication token.
   */
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() input: { email: string; password: string }) {
    return this.authService.login(input);
  }

  /**
   * Verifies the authentication token.
   * @param {object} request - The HTTP request object.
   * @returns {object} The user information associated with the token.
   * @throws {401} If the token is invalid or expired.
   */
  @UseGuards(AuthGuard)
  @Get('me')
  getUserInfo(@Request() request) {
    // Returning the updated request.user, with auth token, from Guard.
    return request.user;
  }
}
