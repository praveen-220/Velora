import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'velora_master_secret_2026';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// --- Advanced SMTP Configuration ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'praveenhoratti2@gmail.com',
        pass: 'wyda xdph ynjb uugw'
    }
});

// --- Database Engine ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/velora';
let isDbConnected = false;
mongoose.connect(MONGO_URI).then(() => { isDbConnected = true; }).catch(() => {});

// --- Advanced Models ---
const userSchema = new mongoose.Schema({
    name: { type: String, default: "Velora Member" },
    email: { type: String, unique: true },
    role: { type: String, default: 'rider' },
    wallet: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    trips: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const rideSchema = new mongoose.Schema({
    driverId: String,
    driverName: String,
    driverRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    from: { address: String, lat: Number, lng: Number },
    to: { address: String, lat: Number, lng: Number },
    price: Number,
    seats: { type: Number, default: 4 },
    carModel: String,
    carNumber: String,
    vehicleType: { type: String, default: 'Velora Go' },
    departure: String,
    status: { type: String, default: 'scheduled' },
}, { timestamps: true });
const Ride = mongoose.models.Ride || mongoose.model('Ride', rideSchema);

const bookingSchema = new mongoose.Schema({
    userId: String,
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
    fare: Number,
    status: { type: String, default: 'confirmed' }, // confirmed, completed, rated
}, { timestamps: true });
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

const messageSchema = new mongoose.Schema({
    rideId: String,
    senderId: String,
    text: String,
}, { timestamps: true });
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// --- In-Memory Stores ---
let mockUsers: any[] = [];
let mockRides: any[] = [];
let mockBookings: any[] = [];
let mockMessages: any[] = [];
let pendingEmailOTPs = new Map<string, string>();

// --- Advanced Auth Endpoints ---
app.post('/api/auth/email/send', async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        pendingEmailOTPs.set(email, otp);
        console.log(`[AUTH] OTP for ${email}: ${otp}`);
        await transporter.sendMail({
            from: '"Velora Support" <praveenhoratti2@gmail.com>',
            to: email,
            subject: 'Your Velora Access Code',
            html: `<div style="background:#0F172A;color:#fff;padding:40px;border-radius:20px;text-align:center;">
                    <h1 style="color:#F97316;">VELORA.</h1>
                    <p>Your secure access code is:</p>
                    <div style="font-size:42px;font-weight:900;color:#F97316;">${otp}</div>
                   </div>`
        });
        res.json({ success: true });
    } catch (err) { res.json({ success: true, fallback: true }); }
});

app.post('/api/auth/email/verify', async (req, res) => {
    const { email, otp, name } = req.body;
    if (pendingEmailOTPs.get(email) === otp) {
        pendingEmailOTPs.delete(email);
        let user = isDbConnected ? await User.findOne({ email }) : mockUsers.find(u => u.email === email);
        if (!user) {
            user = isDbConnected ? new User({ email, name }) : { _id: Date.now().toString(), email, name, wallet: 0, rating: 0, trips: 0 };
            if (isDbConnected) await user.save(); else mockUsers.push(user);
        }
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.json({ success: true, token, user });
    } else res.status(400).json({ error: 'Invalid Code' });
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No Token' });
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const user = isDbConnected ? await User.findById(decoded.id) : mockUsers.find(u => u._id === decoded.id);
        res.json(user);
    } catch (err) { res.status(401).json({ error: 'Expired' }); }
});

app.post('/api/auth/update', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No Token' });
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const { phone, name } = req.body;
        
        let user;
        if (isDbConnected) {
            user = await User.findByIdAndUpdate(decoded.id, { phone, name }, { new: true });
        } else {
            const idx = mockUsers.findIndex(u => u._id === decoded.id);
            if (idx !== -1) {
                mockUsers[idx] = { ...mockUsers[idx], phone, name };
                user = mockUsers[idx];
            }
        }
        res.json({ success: true, user });
    } catch (err) { res.status(400).json({ error: 'Update Failed' }); }
});

app.post('/api/auth/topup', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No Token' });
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const { amount } = req.body;
        
        let user;
        if (isDbConnected) {
            user = await User.findByIdAndUpdate(decoded.id, { $inc: { wallet: amount } }, { new: true });
        } else {
            const idx = mockUsers.findIndex(u => u._id === decoded.id);
            if (idx !== -1) {
                mockUsers[idx].wallet += amount;
                user = mockUsers[idx];
            }
        }
        res.json({ success: true, user });
    } catch (err) { res.status(400).json({ error: 'Topup Failed' }); }
});

// --- Advanced Ride & Booking Endpoints ---
app.get('/api/rides', async (req, res) => {
    const rides = isDbConnected ? await Ride.find({ seats: { $gt: 0 }, status: 'scheduled' }).sort({ createdAt: -1 }) : mockRides;
    res.json(rides);
});

app.post('/api/rides', async (req, res) => {
    const ride = isDbConnected ? new Ride(req.body) : { ...req.body, _id: Date.now().toString(), status: 'scheduled' };
    if (isDbConnected) await ride.save(); else mockRides.unshift(ride);
    res.json({ success: true, ride });
});

app.post('/api/rides/book', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No Token' });
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;
        const { rideId } = req.body;

        if (isDbConnected) {
            const user = await User.findById(userId);
            const ride = await Ride.findById(rideId);
            if (!user || !ride) throw new Error("Invalid");
            if (user.wallet < ride.price) return res.status(400).json({ error: 'Insufficient Wallet Balance' });

            await User.findByIdAndUpdate(userId, { $inc: { wallet: -ride.price, trips: 1 } });
            await Ride.findByIdAndUpdate(rideId, { $inc: { seats: -1 } });
            const booking = new Booking({ userId, rideId, fare: ride.price });
            await booking.save();
        } else {
            const uIdx = mockUsers.findIndex(u => u._id === userId);
            const rIdx = mockRides.findIndex(r => r._id === rideId);
            if (uIdx === -1 || rIdx === -1) throw new Error("Invalid");
            const ridePrice = mockRides[rIdx].price;
            if (mockUsers[uIdx].wallet < ridePrice) return res.status(400).json({ error: 'Insufficient Wallet Balance' });

            mockUsers[uIdx].wallet -= ridePrice;
            mockUsers[uIdx].trips += 1;
            mockRides[rIdx].seats -= 1;
            mockBookings.push({ userId, rideId, fare: ridePrice, _id: Date.now().toString() });
        }
        res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message || 'Booking Failed' }); }
});

app.get('/api/bookings/:userId', async (req, res) => {
    const { userId } = req.params;
    const bookings = isDbConnected ? await Booking.find({ userId }).populate('rideId') : mockBookings.filter(b => b.userId === userId);
    res.json(bookings);
});

// --- Advanced Chat Endpoints ---
app.get('/api/chat/:rideId', async (req, res) => {
    const { rideId } = req.params;
    const messages = isDbConnected ? await Message.find({ rideId }).sort({ createdAt: 1 }) : mockMessages.filter(m => m.rideId === rideId);
    res.json(messages);
});

app.post('/api/chat', async (req, res) => {
    const msg = isDbConnected ? new Message(req.body) : { ...req.body, _id: Date.now().toString(), createdAt: new Date() };
    if (isDbConnected) await msg.save(); else mockMessages.push(msg);
    res.json(msg);
});

// --- Admin Endpoints ---
app.get('/api/admin/stats', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No Token' });
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const user = isDbConnected ? await User.findById(decoded.id) : mockUsers.find(u => u._id === decoded.id);
        
        if (user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

        const stats = {
            totalUsers: isDbConnected ? await User.countDocuments() : mockUsers.length + 5,
            totalRides: isDbConnected ? await Ride.countDocuments() : mockRides.length + 12,
            totalVolume: isDbConnected ? (await Booking.aggregate([{ $group: { _id: null, total: { $sum: "$fare" } } }]))[0]?.total || 0 : 25400,
            activeRides: isDbConnected ? await Ride.countDocuments({ status: 'scheduled' }) : mockRides.length
        };
        res.json(stats);
    } catch (err) { res.status(500).json({ error: 'Stats Failed' }); }
});

app.listen(PORT, () => console.log(`🚀 Advanced Velora API active on ${PORT}`));
