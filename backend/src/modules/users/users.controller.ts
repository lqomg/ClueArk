import { Body, Controller, Get, NotFoundException, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { ChangePasswordDto, UpdateProfileDto } from './dto';
import { toPlainObjectWithoutFields } from '../../common/utils';
import type { User } from './schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    return toPlainObjectWithoutFields<User>(user, ['password']);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async patchMe(@CurrentUser('userId') userId: string, @Body() body: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, { username: body.username, timeZone: body.timeZone });
    return toPlainObjectWithoutFields<User>(user, ['password']);
  }

  @Post('me/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser('userId') userId: string, @Body() body: ChangePasswordDto) {
    await this.usersService.updatePassword(userId, body.oldPassword, body.newPassword);
    return { ok: true };
  }
}
