import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UsersService } from 'src/users/users.service';

type AuthInput = { email: string; password: string };
type AuthOutput = { token: string; user: { userId: number; email: string } };

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
    if (!input.email || !input.password) {
      throw new BadRequestException('email and password are required');
    }

    const user = await this.usersService.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email');
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
      email: user.email,
    };
    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      token: accessToken,
      user: {
        userId: user.userId,
        email: user.email,
      },
    };
  }
}
