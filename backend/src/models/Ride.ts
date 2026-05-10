import mongoose, { Schema, Document } from 'mongoose';

export interface IRide extends Document {
  rider?: mongoose.Types.ObjectId;
  driver?: mongoose.Types.ObjectId;
  pickup: {
    address: string;
    location: { type: string, coordinates: number[] };
  };
  dropoff: {
    address: string;
    location: { type: string, coordinates: number[] };
  };
  status: 'pending' | 'accepted' | 'started' | 'completed' | 'cancelled';
  price: number;
  type: 'ride' | 'reserve' | 'intercity' | 'shuttle';
  seatsAvailable?: number;
  startTime: Date;
}

const RideSchema: Schema = new Schema({
  rider: { type: Schema.Types.ObjectId, ref: 'User' },
  driver: { type: Schema.Types.ObjectId, ref: 'User' },
  pickup: {
    address: { type: String, required: true },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number], // [longitude, latitude]
    }
  },
  dropoff: {
    address: { type: String, required: true },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
    }
  },
  status: { type: String, enum: ['pending', 'accepted', 'started', 'completed', 'cancelled'], default: 'pending' },
  price: { type: Number, required: true },
  type: { type: String, enum: ['ride', 'reserve', 'intercity', 'shuttle'], required: true },
  seatsAvailable: { type: Number },
  startTime: { type: Date, default: Date.now },
}, { timestamps: true });

RideSchema.index({ "pickup.location": "2dsphere" });
RideSchema.index({ "dropoff.location": "2dsphere" });

export default mongoose.model<IRide>('Ride', RideSchema);
