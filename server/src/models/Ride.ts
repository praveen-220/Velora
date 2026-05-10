import { Schema, model } from 'mongoose';

const rideSchema = new Schema({
  driverId: { type: String, required: true },
  from: {
    address: String,
    lat: Number,
    lng: Number
  },
  to: {
    address: String,
    lat: Number,
    lng: Number
  },
  carType: { type: String, enum: ['Velora Go', 'Premier', 'XL', 'Intercity'], default: 'Velora Go' },
  seats: { type: Number, default: 4 },
  price: { type: Number, required: true },
  departureTime: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'ongoing', 'completed', 'cancelled'], default: 'pending' },
  passengers: [{ type: String }],
}, { timestamps: true });

export const Ride = model('Ride', rideSchema);
