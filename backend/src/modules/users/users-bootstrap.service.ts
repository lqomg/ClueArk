import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { USER_ROLE } from './user-role';

/**
 * 首个超级管理员种子（原 CatalogSeedService 中逻辑）。
 */
@Injectable()
export class UsersBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(UsersBootstrapService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    const count = await this.usersService.countByRole(USER_ROLE.Admin);
    if (count > 0) {
      this.logger.log('已存在管理员账号，跳过超级管理员种子');
      return;
    }

    const email = (this.config.get<string>('ADMIN_EMAIL') || 'admin@clueark.local').trim().toLowerCase();
    const nodeEnv = this.config.get<string>('NODE_ENV') || 'development';
    let password = this.config.get<string>('ADMIN_PASSWORD');
    if (!password?.trim()) {
      if (nodeEnv === 'production') {
        this.logger.warn('生产环境未设置 ADMIN_PASSWORD，跳过超级管理员种子（请手动创建管理员或配置环境变量）');
        return;
      }
      password = '123456qian';
      this.logger.warn(`开发环境未设置 ADMIN_PASSWORD，使用默认密码（请务必登录后修改）：${password}`);
    }

    try {
      await this.usersService.createSuperAdminIfMissing(email, password.trim());
      this.logger.log(`超级管理员已就绪：${email}`);
    } catch (e) {
      if (e instanceof ConflictException) {
        this.logger.warn(
          `无法创建超级管理员：邮箱 ${email} 已被普通用户占用，请更换 ADMIN_EMAIL 或手动提升角色`,
        );
        return;
      }
      throw e;
    }
  }
}
