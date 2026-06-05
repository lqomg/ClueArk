import { Body, Controller, Get, NotFoundException, Post, Put, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { ChangePasswordDto, SaveProfileDto } from './dto';
import { toPlainObjectWithoutFields } from '../../common/utils';
import type { User } from './schemas/user.schema';
import { MonitorLocaleBriefService } from '../monitors/monitor-locale-brief.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly monitorLocaleBrief: MonitorLocaleBriefService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    return toPlainObjectWithoutFields<User>(user, ['password']);
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  async saveProfile(@CurrentUser('userId') userId: string, @Body() body: SaveProfileDto) {
    const { user, localeChanged } = await this.usersService.updateProfile(userId, {
      username: body.username,
      timeZone: body.timeZone,
      locale: body.locale,
    });
    const plain = toPlainObjectWithoutFields<User>(user, ['password']);
    if (localeChanged) {
      void this.monitorLocaleBrief.enqueueBriefRunsForUser(userId);
    }
    return { ...plain, localeChanged };
  }

  @Post('me/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser('userId') userId: string, @Body() body: ChangePasswordDto) {
    const user = await this.usersService.updatePassword(userId, body.oldPassword, body.newPassword);
    // 旧 token 因 passwordChangedAt 而失效，签发新 token 维持当前会话
    const access_token = this.jwtService.sign({
      email: user.email,
      sub: String(user._id),
      role: user.role,
    });
    return { ok: true, access_token };
  }
}
