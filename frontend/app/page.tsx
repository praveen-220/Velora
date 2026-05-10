'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ServiceGrid from '../components/ServiceGrid';
import OfferRide from '../components/OfferRide';

export default function Home() {
  const [activeTab, setActiveTab] = useState('book'); // 'book' or 'offer'

  return (
    <main>
      <Navbar />
      
      <div className="container" style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #EEE' }}>
          <button 
            onClick={() => setActiveTab('book')}
            style={{ 
              padding: '16px 24px', 
              border: 'none', 
              background: 'none', 
              fontSize: '18px', 
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'book' ? '3px solid #000' : 'none',
              color: activeTab === 'book' ? '#000' : '#555'
            }}
          >
            Book a Ride
          </button>
          <button 
            onClick={() => setActiveTab('offer')}
            style={{ 
              padding: '16px 24px', 
              border: 'none', 
              background: 'none', 
              fontSize: '18px', 
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'offer' ? '3px solid #000' : 'none',
              color: activeTab === 'offer' ? '#000' : '#555'
            }}
          >
            Offer a Ride
          </button>
        </div>
      </div>

      {activeTab === 'book' ? (
        <>
          <Hero />
          <ServiceGrid />
        </>
      ) : (
        <div className="container">
          <OfferRide />
        </div>
      )}
      
      {/* Footer / Extra sections can go here */}
      <footer style={{ padding: '40px 0', borderTop: '1px solid #EEE' }}>
        <div className="container">
          <div style={{ color: '#555', fontSize: '12px' }}>
            © 2026 Velora Technologies Inc. | Made for India
          </div>
        </div>
      </footer>
    </main>
  );
}
