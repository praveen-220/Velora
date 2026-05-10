import { Router, Request, Response } from 'express';
import Ride from '../models/Ride';

const router = Router();

// Create a ride request
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { pickup, dropoff, type, price, riderId } = req.body;
    const ride = await Ride.create({
      rider: riderId,
      pickup,
      dropoff,
      type,
      price
    });
    res.status(201).json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Error creating ride request', error });
  }
});

// Offer a ride (Carpooling)
router.post('/offer', async (req: Request, res: Response) => {
  try {
    const { pickup, dropoff, price, driverId, seatsAvailable, startTime } = req.body;
    const ride = await Ride.create({
      driver: driverId,
      pickup,
      dropoff,
      price,
      type: 'intercity',
      seatsAvailable,
      startTime
    });
    res.status(201).json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Error offering ride', error });
  }
});

// Get available rides (for carpooling discovery)
router.get('/available', async (req: Request, res: Response) => {
  try {
    const rides = await Ride.find({ 
      status: 'pending', 
      seatsAvailable: { $gt: 0 },
      startTime: { $gte: new Date() }
    }).populate('driver', 'name rating');
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rides', error });
  }
});

export default router;
