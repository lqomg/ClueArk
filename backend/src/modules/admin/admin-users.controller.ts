import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { AdminGuard } from './guards/admin.guard';
import { UsersService } from '../users/users.service';
import { AdminUserActiveDto } from './dto/admin-user-active.dto';
import { toPlainObjectWithoutFields } from '../../common/utils/mongoose.utils';
import type { User } from '../users/schemas/user.schema';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.listUsersForAdmin(page, pageSize, search);
  }

  @Patch(':id/active')
  async setActive(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body() body: AdminUserActiveDto,
  ) {
    const u = await this.usersService.setUserActive(adminId, id, body.isActive);
    return toPlainObjectWithoutFields<User>(u, ['password']);
  }
}
