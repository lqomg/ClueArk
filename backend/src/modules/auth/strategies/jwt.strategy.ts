import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import type { UserRole } from '../../users/schemas/user.schema';

export interface JwtValidatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email?: string }): Promise<JwtValidatedUser> {
    const user = await this.usersService.findByIdForAuth(payload.sub);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('user_inactive_or_missing');
    }
    const role = user.role ?? 'user';
    return { userId: String(user._id), email: user.email, role };
  }
}
