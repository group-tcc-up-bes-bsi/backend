import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UsersService } from 'src/users/users.service';

type AuthInput = { username: string; password: string };
type AuthOutput = { token: string; user: { userId: number; username: string } };

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  //////////////////////////////////////////////////////////////////////
  // Public methods
  ///////////////////////////////////////////////////////////////////////

  async login(input: AuthInput): Promise<AuthOutput | null> {
    // Sanity check
    if (!input.username || !input.password) {
      throw new BadRequestException('Username and password are required');
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

  private async signIn(user: User): Promise<AuthOutput> {
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
