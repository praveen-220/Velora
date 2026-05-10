import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (to: string, otp: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Velora - Your OTP for Verification',
    text: `Your OTP for Velora is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #000;">
        <h2>Velora Verification</h2>
        <p>Your One-Time Password (OTP) for login is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #000;">${otp}</h1>
        <p>If you didn't request this, please ignore this email.</p>
        <hr />
        <p style="font-size: 12px; color: #555;">© 2026 Velora Technologies</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
