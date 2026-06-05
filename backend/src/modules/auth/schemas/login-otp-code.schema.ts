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

  /** 校验失败累计次数；达到上限后作废该邮箱所有有效验证码以防暴力破解 */
  @Prop({ default: 0 })
  attempts: number;
}

export const LoginOtpCodeSchema = SchemaFactory.createForClass(LoginOtpCode);

LoginOtpCodeSchema.index({ email: 1, createdAt: -1 });
LoginOtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
