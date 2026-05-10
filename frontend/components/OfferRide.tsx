import React, { useState } from 'react';

const OfferRide = () => {
  const [formData, setFormData] = useState({
    pickup: '',
    dropoff: '',
    price: '',
    seats: '1',
    startTime: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Offering ride:', formData);
    // In a real app, call the backend /api/rides/offer here
    alert('Ride offered successfully!');
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ marginBottom: '24px' }}>Offer a Ride</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label className="body-copy" style={{ display: 'block', marginBottom: '8px' }}>Pickup Location</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Enter city or area"
            value={formData.pickup}
            onChange={(e) => setFormData({...formData, pickup: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="body-copy" style={{ display: 'block', marginBottom: '8px' }}>Dropoff Location</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Enter destination"
            value={formData.dropoff}
            onChange={(e) => setFormData({...formData, dropoff: e.target.value})}
            required
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="body-copy" style={{ display: 'block', marginBottom: '8px' }}>Price per seat (₹)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0 for free"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="body-copy" style={{ display: 'block', marginBottom: '8px' }}>Seats Available</label>
            <select 
              className="input-field"
              value={formData.seats}
              onChange={(e) => setFormData({...formData, seats: e.target.value})}
            >
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="body-copy" style={{ display: 'block', marginBottom: '8px' }}>Start Time</label>
          <input 
            type="datetime-local" 
            className="input-field"
            value={formData.startTime}
            onChange={(e) => setFormData({...formData, startTime: e.target.value})}
            required
          />
        </div>
        <button type="submit" className="btn-primary" style={{ height: '56px', marginTop: '16px' }}>
          List my ride
        </button>
      </form>
    </div>
  );
};

export default OfferRide;
