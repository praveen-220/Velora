import React from 'react';

const Hero = () => {
  return (
    <section style={{ padding: 'var(--section-padding) 0' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
        <div>
          <img src="/velora_gold_logo.png" alt="Velora" style={{ height: '96px', marginBottom: '24px' }} />
          <h1 style={{ marginBottom: '32px' }}>Request a ride for now or later</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <input 
              type="text" 
              placeholder="Pickup location" 
              className="input-field" 
              style={{ background: '#F5F5F5' }}
            />
            <input 
              type="text" 
              placeholder="Dropoff location" 
              className="input-field" 
              style={{ background: '#F5F5F5' }}
            />
          </div>
          <button className="btn-primary" style={{ height: '56px', width: '160px' }}>See prices</button>
        </div>
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '400px' }}>
          <img 
            src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1000&auto=format&fit=crop" 
            alt="Ride" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .container {
            grid-template-columns: 1fr !important;
          }
          img {
            display: none;
          }
          button {
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;
