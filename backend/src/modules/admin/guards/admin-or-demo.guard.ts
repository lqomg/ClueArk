import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { JwtValidatedUser } from '../../auth/strategies/jwt.strategy';
import { USER_ROLE } from '../../users/user-role';

const STAFF_ROLES = new Set<JwtValidatedUser['role']>([USER_ROLE.Admin, USER_ROLE.Demo]);

@Injectable()
export class AdminOrDemoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: JwtValidatedUser }>();
    const user = req.user;
    if (!user || !STAFF_ROLES.has(user.role)) {
      throw new ForbiddenException('staff_only');
    }
    return true;
  }
}
