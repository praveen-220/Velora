import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  profilePic?: string;
  role: 'rider' | 'driver' | 'admin';
  isVerified: boolean;
  rating: number;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  profilePic: { type: String },
  role: { type: String, enum: ['rider', 'driver', 'admin'], default: 'rider' },
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 5.0 },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
