import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { UsersService } from '../users/users.service';
import { USER_ROLE } from '../users/user-role';
import { AdminGuard } from './guards/admin.guard';
import { AdminLoginDto } from './dto/admin-login.dto';
import { toPlainObjectWithoutFields } from '../../common/utils/mongoose.utils';
import type { User } from '../users/schemas/user.schema';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    const result = await this.authService.loginWithPassword(dto.account, dto.password);
    if (result.user.role !== USER_ROLE.Admin) {
      throw new ForbiddenException('admin_only');
    }
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async me(@CurrentUser('userId') userId: string) {
    const u = await this.usersService.findById(userId);
    if (!u) {
      throw new ForbiddenException('admin_only');
    }
    return toPlainObjectWithoutFields<User>(u, ['password']);
  }
}
