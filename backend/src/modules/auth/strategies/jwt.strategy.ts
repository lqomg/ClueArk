import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { USER_ROLE, type UserRole } from '../../users/user-role';

export interface JwtValidatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email?: string; iat?: number }): Promise<JwtValidatedUser> {
    const user = await this.userModel
      .findById(payload.sub)
      .select('email isActive role passwordChangedAt')
      .lean()
      .exec();
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('user_inactive_or_missing');
    }
    // 密码变更后，使该时刻之前签发的 token 失效（1s 容差避免同秒签发误杀）
    const changedAt = (user as { passwordChangedAt?: Date }).passwordChangedAt;
    if (changedAt) {
      const issuedAtMs = (payload.iat ?? 0) * 1000;
      if (issuedAtMs + 1000 < new Date(changedAt).getTime()) {
        throw new UnauthorizedException('token_revoked_password_changed');
      }
    }
    const role = (user.role as UserRole | undefined) ?? USER_ROLE.User;
    return { userId: String(user._id), email: user.email, role };
  }
}
