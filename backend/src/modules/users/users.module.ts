import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersBootstrapService } from './users-bootstrap.service';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { MonitorLocaleBriefModule } from '../monitors/monitor-locale-brief.module';

@Module({
  imports: [
    AuthGuardsModule,
    MonitorLocaleBriefModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersBootstrapService],
  exports: [UsersService],
})
export class UsersModule {}
