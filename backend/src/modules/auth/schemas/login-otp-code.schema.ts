import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LoginOtpCodeDocument = LoginOtpCode & Document;

/** 无密码、仅凭邮箱验证码登录时使用的短期验证码 */
@Schema({ timestamps: true, collection: 'login_otp_codes' })
export class LoginOtpCode {
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  consumed: boolean;
}

export const LoginOtpCodeSchema = SchemaFactory.createForClass(LoginOtpCode);

LoginOtpCodeSchema.index({ email: 1, createdAt: -1 });
LoginOtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
