import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard responsible for protecting routes that require authentication.
 * It checks the presence and validity of the JWT token in the request headers.
 * If the token is valid, it adds the user information to the request object.
 * If the token is invalid or missing, it throws an UnauthorizedException.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  /**
   * Constructor for the AuthGuard.
   * @param {JwtService} jwtService - The JWT service instance used for token verification.
   */
  constructor(private jwtService: JwtService) {}

  /**
   * Checks if the request is authenticated by verifying the JWT token.
   * @param {ExecutionContext} context - The execution context containing the request.
   * @returns {Promise<boolean>} - Returns true if the token is valid.
   * @throws {UnauthorizedException} - If the token is missing or invalid.
   */
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const token = authHeader?.split(' ')[1]; // Authorization header: "Bearer <token>"

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const tokenPayload = await this.jwtService.verifyAsync(token);
      // Adding the auth user information to the request object.
      request.user = {
        userId: tokenPayload.sub,
        username: tokenPayload.username,
      };
      return true;
    } catch (e) {
      this.logger.error('Token verification failed', e);
      throw new UnauthorizedException();
    }
  }
}
