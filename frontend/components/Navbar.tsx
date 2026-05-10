'use client';

import React, { useState } from 'react';
import LoginModal from './LoginModal';

const Navbar = () => {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/velora_gold_logo.png" alt="Velora" style={{ height: '32px' }} />
            </div>
            <div className="nav-links" style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
              <a href="#">Ride</a>
              <a href="#">Drive</a>
              <a href="#">Business</a>
              <a href="#">About</a>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => setModalOpen(true)} style={{ color: '#FFF', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Log in</button>
            <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ backgroundColor: '#FFF', color: '#000', padding: '8px 16px' }}>Sign up</button>
          </div>
        </div>
        <style jsx>{`
          .nav-links a {
            color: #FFF;
            text-decoration: none;
          }
          @media (max-width: 768px) {
            .nav-links {
              display: none !important;
            }
          }
        `}</style>
      </nav>
      <LoginModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default Navbar;
