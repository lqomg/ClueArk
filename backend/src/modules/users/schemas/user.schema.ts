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

  /** 本地密码登录；Google 等 OAuth 用户可无密码 */
  @Prop({ select: false })
  password?: string;

  /** Google OAuth `sub`，与邮箱账号绑定时用于快速查找 */
  @Prop({ trim: true, sparse: true, unique: true })
  googleSub?: string;

  /** 最近一次密码变更时间；用于使该时刻之前签发的 JWT 失效 */
  @Prop({ type: Date })
  passwordChangedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, enum: [...USER_ROLE_VALUES], default: USER_ROLE.User, index: true })
  role: UserRole;

  /** IANA 时区，用于展示与按日历日聚合；API 仍返回 UTC 瞬时 */
  @Prop({ required: true, default: 'Asia/Shanghai', trim: true })
  timeZone: string;

  /** UI 与 LLM 衍生内容语言（en | zh-CN | ja | ko） */
  @Prop({ type: String, required: true, enum: ['en', 'zh-CN', 'ja', 'ko'], default: 'en', trim: true })
  locale: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
