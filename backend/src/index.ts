import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDatabases } from './db';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

connectDatabases();

import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Velora Backend API is running' });
});

// Socket.io for real-time tracking
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('update-location', (data) => {
    // Broadcast location to relevant users
    io.emit('location-update', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
