import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RegisterEmailCodeDocument = RegisterEmailCode & Document;

@Schema({ timestamps: true, collection: 'register_email_codes' })
export class RegisterEmailCode {
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  consumed: boolean;
}

export const RegisterEmailCodeSchema = SchemaFactory.createForClass(RegisterEmailCode);

RegisterEmailCodeSchema.index({ email: 1, createdAt: -1 });
RegisterEmailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
