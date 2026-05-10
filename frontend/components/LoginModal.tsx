'use client';

import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStep(2);
      } else {
        alert('Failed to send OTP');
      }
    } catch (err) {
      alert('Error connecting to backend');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        alert('Login Successful!');
        onClose();
      } else {
        alert(data.message || 'Invalid OTP');
      }
    } catch (err) {
      alert('Error connecting to backend');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '12px', width: '400px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/velora_gold_logo.png" alt="Velora" style={{ height: '40px' }} />
          <h2 style={{ marginTop: '16px' }}>{step === 1 ? 'Log In or Sign Up' : 'Enter OTP'}</h2>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <input 
              type="email" 
              className="input-field" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ marginBottom: '16px' }}
            />
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', height: '56px' }}>
              {loading ? 'Sending...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>OTP sent to {email}</p>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter 6-digit OTP" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              style={{ marginBottom: '16px' }}
            />
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', height: '56px' }}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ width: '100%', marginTop: '12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>
              Change Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
