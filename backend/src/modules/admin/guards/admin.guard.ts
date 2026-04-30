import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { JwtValidatedUser } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: JwtValidatedUser }>();
    const user = req.user;
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('admin_only');
    }
    return true;
  }
}
