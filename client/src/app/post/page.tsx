"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Map as MapIcon, Navigation, Car, Calendar, Hash } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function PostRidePage() {
  const { user } = useAuth();
  const [from, setFrom] = useState({ address: "", lat: 19.0760, lng: 72.8777 });
  const [to, setTo] = useState({ address: "", lat: 18.5204, lng: 73.8567 });
  
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);

  const [carBrand, setCarBrand] = useState('Tata');
  const [carModelName, setCarModelName] = useState('Nexon');
  const [yearsUsed, setYearsUsed] = useState<number>(2);
  const [vehicleType, setVehicleType] = useState('Velora Go');

  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch location suggestions as user types
  const fetchSuggestions = async (query: string, type: 'from' | 'to') => {
    if (type === 'from') setFrom({ ...from, address: query });
    else setTo({ ...to, address: query });

    if (query.length < 3) {
      if (type === 'from') setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=4`);
      const data = await res.json();
      if (type === 'from') setFromSuggestions(data || []);
      else setToSuggestions(data || []);
    } catch (err) {
      console.error("Suggestion fetch failed", err);
    }
  };

  const selectLocation = (suggestion: any, type: 'from' | 'to') => {
    const coords = {
      address: suggestion.display_name.split(',').slice(0, 3).join(','),
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    };
    if (type === 'from') {
      setFrom(coords);
      setFromSuggestions([]);
    } else {
      setTo(coords);
      setToSuggestions([]);
    }
  };

  const calculateDistanceAndPrice = () => {
    if (!from.lat || !to.lat) return;
    
    // Haversine formula
    const R = 6371; 
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;
    
    // Advanced Price Calculation
    const typeMultipliers: any = { 'Velora Go': 1, 'Velora Prime': 1.5, 'Velora XL': 2.5 };
    
    // Brand Multiplier logic
    const luxuryBrands = ['Mercedes', 'BMW', 'Audi', 'Jaguar', 'Porsche', 'Volvo'];
    const premiumBrands = ['Honda', 'Toyota', 'Volkswagen', 'Skoda', 'Jeep', 'MG'];
    let brandMultiplier = 1.0;
    if (luxuryBrands.some(b => carBrand.toLowerCase().includes(b.toLowerCase()))) brandMultiplier = 1.8;
    else if (premiumBrands.some(b => carBrand.toLowerCase().includes(b.toLowerCase()))) brandMultiplier = 1.3;

    // Age logic
    let ageMultiplier = 1.0;
    if (yearsUsed <= 2) ageMultiplier = 1.2;
    else if (yearsUsed >= 5) ageMultiplier = 0.85;

    const baseFare = distanceKm * 12;
    const calculatedPrice = Math.round(baseFare * typeMultipliers[vehicleType] * brandMultiplier * ageMultiplier);
    
    setPrice(calculatedPrice > 50 ? calculatedPrice : 50); 
  };

  useEffect(() => {
    calculateDistanceAndPrice();
  }, [from.lat, from.lng, to.lat, to.lng, vehicleType, carBrand, yearsUsed]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) { alert("Session expired. Please login again."); return; }
    
    setLoading(true);
    const fullCarModel = `${carBrand} ${carModelName}`;
    
    const rideData = {
        driverId: user._id,
        driverName: user.name,
        driverRating: user.rating || 0,
        reviewsCount: user.trips || 0,
        from, to, price,
        seats: vehicleType === 'Velora XL' ? 6 : 4,
        carModel: fullCarModel,
        carNumber: "MH-01-VL-2026",
        vehicleType,
        departure: "Flexible",
        status: "scheduled"
    };

    try {
        const res = await fetch('http://localhost:5000/api/rides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rideData)
        });
        if (res.ok) {
            alert("Journey Published! Partners can now join your ride.");
            window.location.href = '/dashboard';
        }
    } catch (err) { alert("Network error."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pt-32 px-6 pb-24 bg-slate-950 text-white selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <Link href="/dashboard" className="w-12 h-12 flex items-center justify-center bg-slate-900 border border-white/5 rounded-2xl hover:bg-slate-800 transition-colors">
                <ArrowLeft size={20} className="text-white" />
            </Link>
            <div>
                <h1 className="text-5xl font-black tracking-tighter">Offer a Ride</h1>
                <p className="text-slate-500 font-medium text-lg">Monetize your journey and connect with the network.</p>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <form onSubmit={handleSubmit} className="space-y-10">
              
              {/* Routing Card */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                  <h3 className="text-2xl font-black flex items-center gap-3 text-white">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Navigation size={22} className="text-indigo-400"/>
                      </div>
                      Route Specification
                  </h3>
                  
                  <div className="space-y-6">
                      <div className="space-y-2 relative group">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Pickup Point</label>
                          <div className="relative">
                              <Navigation size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:scale-110 transition-transform" />
                              <input 
                                  type="text" required
                                  value={from.address} 
                                  onChange={(e) => fetchSuggestions(e.target.value, 'from')}
                                  placeholder="Search pick-up location..." 
                                  className="w-full bg-slate-950/50 border border-white/5 p-5 pl-14 rounded-2xl text-sm font-bold focus:border-indigo-500/50 outline-none transition-all"
                              />
                          </div>
                          {fromSuggestions.length > 0 && (
                              <div className="absolute z-50 w-full bg-slate-900 border border-white/10 rounded-2xl mt-2 shadow-2xl overflow-hidden backdrop-blur-xl">
                                  {fromSuggestions.map((s, i) => (
                                      <div key={i} onClick={() => selectLocation(s, 'from')} className="p-5 hover:bg-indigo-600/20 cursor-pointer text-xs font-bold border-b border-white/5 last:border-0 truncate transition-colors text-slate-300 hover:text-white">
                                          {s.display_name}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      <div className="space-y-2 relative group">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Destination</label>
                          <div className="relative">
                              <MapIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-400 group-focus-within:scale-110 transition-transform" />
                              <input 
                                  type="text" required
                                  value={to.address} 
                                  onChange={(e) => fetchSuggestions(e.target.value, 'to')}
                                  placeholder="Where are you heading?" 
                                  className="w-full bg-slate-950/50 border border-white/5 p-5 pl-14 rounded-2xl text-sm font-bold focus:border-indigo-500/50 outline-none transition-all"
                              />
                          </div>
                          {toSuggestions.length > 0 && (
                              <div className="absolute z-50 w-full bg-slate-900 border border-white/10 rounded-2xl mt-2 shadow-2xl overflow-hidden backdrop-blur-xl">
                                  {toSuggestions.map((s, i) => (
                                      <div key={i} onClick={() => selectLocation(s, 'to')} className="p-5 hover:bg-purple-600/20 cursor-pointer text-xs font-bold border-b border-white/5 last:border-0 truncate transition-colors text-slate-300 hover:text-white">
                                          {s.display_name}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Vehicle Details Card */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                  <h3 className="text-2xl font-black flex items-center gap-3 text-white">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Car size={22} className="text-purple-400"/>
                      </div>
                      Vehicle Integrity
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 group">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Manufacturer</label>
                        <div className="relative">
                            <Car size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400" />
                            <input type="text" required value={carBrand} onChange={(e) => setCarBrand(e.target.value)} placeholder="e.g. Toyota" className="w-full bg-slate-950/50 border border-white/5 p-5 pl-14 rounded-2xl text-sm font-bold focus:border-indigo-500/50 outline-none transition-all" />
                        </div>
                    </div>
                    <div className="space-y-2 group">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Model Name</label>
                        <div className="relative">
                            <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400" />
                            <input type="text" required value={carModelName} onChange={(e) => setCarModelName(e.target.value)} placeholder="e.g. Fortuner" className="w-full bg-slate-950/50 border border-white/5 p-5 pl-14 rounded-2xl text-sm font-bold focus:border-indigo-500/50 outline-none transition-all" />
                        </div>
                    </div>
                  </div>

                  <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Vehicle Age (Years)</label>
                      <div className="relative">
                          <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400" />
                          <input type="number" required min="0" max="20" value={yearsUsed} onChange={(e) => setYearsUsed(parseInt(e.target.value)||0)} className="w-full bg-slate-950/50 border border-white/5 p-5 pl-14 rounded-2xl text-sm font-bold focus:border-indigo-500/50 outline-none transition-all" />
                      </div>
                  </div>
              </div>

              {/* Class Selection */}
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Experience Tier</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <VehicleCard 
                        active={vehicleType === 'Velora Go'} 
                        onClick={() => setVehicleType('Velora Go')}
                        title="Velora Go" icon="🚗" multiplier={1} color="text-slate-400"
                      />
                      <VehicleCard 
                        active={vehicleType === 'Velora Prime'} 
                        onClick={() => setVehicleType('Velora Prime')}
                        title="Prime" icon="✨" multiplier={1.5} color="text-indigo-400"
                      />
                      <VehicleCard 
                        active={vehicleType === 'Velora XL'} 
                        onClick={() => setVehicleType('Velora XL')}
                        title="XL Hub" icon="🚐" multiplier={2.5} color="text-purple-400"
                      />
                  </div>
              </div>

              <button 
                  type="submit"
                  disabled={loading || !from.address || !to.address || price <= 0}
                  className="btn-primary w-full py-6 text-xl tracking-tighter disabled:opacity-50 shadow-[0_0_30px_rgba(99,102,241,0.2)] hover:scale-[1.02] active:scale-[0.98]"
              >
                  {loading ? (
                    <span className="flex items-center gap-3 justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Encrypting & Publishing...
                    </span>
                  ) : "Publish Premium Journey"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/60 backdrop-blur-2xl border border-indigo-500/20 p-12 text-center sticky top-32 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
                
                <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Calculator size={40} className="text-indigo-400" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Projected Earnings</p>
                <div className="text-7xl font-black text-white tracking-tighter mb-10 text-glow">₹{price}</div>
                
                <div className="space-y-4 text-left border-t border-white/5 pt-10">
                    <SummaryRow label="Network Node" value="Active" />
                    <SummaryRow label="Fleet Tier" value={vehicleType} />
                    <SummaryRow label="Brand Value" value={carBrand} />
                    <SummaryRow label="Asset Health" value={`${yearsUsed}Y Maturity`} />
                </div>
                
                <div className="mt-10 p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-[10px] text-indigo-400 font-black uppercase tracking-widest leading-relaxed">
                    Dynamic pricing synced with real-time market liquidity & route complexity.
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ active, onClick, title, icon, multiplier, color }: any) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={`p-8 rounded-[2rem] border-2 transition-all duration-500 flex flex-col items-center gap-4 group ${active ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-white/5 bg-slate-900/40 text-slate-500 hover:border-white/10 hover:bg-slate-800/60'}`}
        >
            <span className={`text-5xl transition-transform duration-500 ${active ? 'scale-110 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'group-hover:scale-105'} ${color}`}>{icon}</span>
            <div className="text-center">
                <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${active ? 'text-white' : 'text-slate-400'}`}>{title}</span>
                <span className="text-[10px] font-bold text-slate-500 tracking-tighter">{multiplier}x Intelligence</span>
            </div>
        </button>
    );
}

function SummaryRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center group/row">
      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">{label}</span>
      <span className="text-sm font-black text-white group-hover/row:text-indigo-400 transition-colors">{value}</span>
    </div>
  );
}
