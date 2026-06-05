import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PasswordResetCodeDocument = PasswordResetCode & Document;

@Schema({ timestamps: true })
export class PasswordResetCode {
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

export const PasswordResetCodeSchema = SchemaFactory.createForClass(PasswordResetCode);

PasswordResetCodeSchema.index({ email: 1, createdAt: -1 });
PasswordResetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
