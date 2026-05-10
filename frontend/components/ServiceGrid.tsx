import React from 'react';

const services = [
  {
    title: 'Ride',
    desc: 'Go anywhere with Velora. Request a ride, hop in, and go.',
    img: 'https://images.unsplash.com/photo-1532581133568-3cd355931349?q=80&w=300&auto=format&fit=crop'
  },
  {
    title: 'Reserve',
    desc: 'Reserve your ride in advance so you can relax on the day.',
    img: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=300&auto=format&fit=crop'
  },
  {
    title: 'Intercity',
    desc: 'Convenient, affordable outstation cabs anytime.',
    img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=300&auto=format&fit=crop'
  }
];

const ServiceGrid = () => {
  return (
    <section style={{ paddingBottom: 'var(--section-padding)' }}>
      <div className="container">
        <h2 style={{ marginBottom: '32px' }}>Explore what you can do with Velora</h2>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--card-gap)' }}>
          {services.map((s, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="card-title">{s.title}</div>
                  <div className="body-copy" style={{ marginTop: '8px' }}>{s.desc}</div>
                  <button className="btn-outline" style={{ marginTop: '16px' }}>Details</button>
                </div>
                <img src={s.img} alt={s.title} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .grid-3 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};

export default ServiceGrid;
