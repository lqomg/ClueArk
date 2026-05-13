import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { USER_ROLE, USER_ROLE_VALUES, type UserRole } from '../user-role';

export type { UserRole };

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  username: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, enum: [...USER_ROLE_VALUES], default: USER_ROLE.User, index: true })
  role: UserRole;

  /** IANA 时区，用于展示与按日历日聚合；API 仍返回 UTC 瞬时 */
  @Prop({ default: 'Asia/Shanghai', trim: true })
  timeZone: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
