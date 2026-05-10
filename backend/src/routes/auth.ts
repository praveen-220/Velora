import { Router, Request, Response } from 'express';
import User from '../models/User';
import { sendOTP } from '../utils/mailer';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. OTP Login (Email based as per Nodemailer request)
router.post('/send-otp', async (req: Request, res: Response) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    // Store OTP in DB or Redis in production. For now, we just send it.
    // In a real app, you'd associate this OTP with the user in the DB.
    await sendOTP(email, otp);
    res.json({ message: 'OTP sent successfully to ' + email });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  // Mock verification logic (In production, verify against DB/Redis)
  if (otp === '123456' || otp) { // Allow any OTP for now for testing
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ 
        email, 
        name: 'Velora User', 
        phone: 'Not provided',
        role: 'rider' 
      });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ message: 'Login successful', user, token });
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
});

// 2. Google OAuth Login
router.post('/google-login', async (req: Request, res: Response) => {
  const { tokenId } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ message: 'Invalid Google Token' });

    const { email, name, picture } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name,
        profilePic: picture,
        phone: 'Not provided',
        role: 'rider',
        isVerified: true
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: 'Google Login failed', error });
  }
});

export default router;
