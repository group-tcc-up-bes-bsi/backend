import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

type AuthInput = { username: string; password: string };
type AuthOutput = { token: string; user: { userId: number; username: string } };

/**
 * Service responsible for handling authentication-related logic.
 */
@Injectable()
export class AuthService {
  /**
   * Creates an instance of AuthService.
   * @param {UsersService} usersService - The service responsible for user operations.
   * @param {JwtService} jwtService - The service responsible for handling JWT operations.
   */
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  //////////////////////////////////////////////////////////////////////
  // Public methods
  ///////////////////////////////////////////////////////////////////////

  /**
   * Handles user login by validating credentials and generating a JWT token.
   * @param {AuthInput} input - The login credentials.
   * @param {string} input.username - The user's username address.
   * @param {string} input.password - The user's password.
   * @returns {Promise<AuthOutput>} The authentication token and user information.
   * @throws {BadRequestException} If username or password is missing.
   * @throws {UnauthorizedException} If the username or password is invalid.
   */
  async login(input: AuthInput): Promise<AuthOutput> {
    // Sanity check
    if (!input.username || !input.password) {
      throw new BadRequestException('username and password are required');
    }

    const user = await this.usersService.findByUsername(input.username);

    if (!user) {
      throw new UnauthorizedException('Invalid username');
    }

    if (user.password === input.password) {
      return this.signIn(user);
    } else {
      throw new UnauthorizedException('Invalid password');
    }
  }

  ///////////////////////////////////////////////////////////////////////
  // Private methods
  ///////////////////////////////////////////////////////////////////////

  private async signIn(user): Promise<AuthOutput> {
    const tokenPayload = {
      sub: user.userId,
      username: user.username,
    };
    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      token: accessToken,
      user: {
        userId: user.userId,
        username: user.username,
      },
    };
  }
}
