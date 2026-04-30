import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async checkHealth() {
    try {
      // 检查数据库连接状态
      const dbStatus = this.connection.readyState === 1 ? 'connected' : 'disconnected';
      
      // 检查其他可能的服务状态
      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
        details: {
          database: {
            status: dbStatus === 'connected' ? 'up' : 'down',
          },
        },
      };

      return healthStatus;
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

}