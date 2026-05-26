import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly health: HealthService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async checkHealth() {
    const dbStatus = this.connection.readyState === 1 ? 'connected' : 'disconnected';
    return {
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
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async readiness() {
    const result = await this.health.readiness();
    if (result.status !== 'ready') {
      throw new ServiceUnavailableException(result);
    }
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: result.checks,
    };
  }
}
