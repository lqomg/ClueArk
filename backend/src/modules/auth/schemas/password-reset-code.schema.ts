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
}

export const PasswordResetCodeSchema = SchemaFactory.createForClass(PasswordResetCode);

PasswordResetCodeSchema.index({ email: 1, createdAt: -1 });
PasswordResetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
