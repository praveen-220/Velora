"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, Star, Car, Zap, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

export default function SearchPage() {
  const { user, refreshUser } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);

  const fetchRides = () => {
    setLoading(true);
    fetch('http://localhost:5000/api/rides')
      .then(res => res.json())
      .then(data => { 
        const activeRides = data.filter((r: any) => r.status === 'scheduled' || !r.status);
        setRides(activeRides); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  };

  const sortByPrice = () => {
    const sorted = [...rides].sort((a, b) => a.price - b.price);
    setRides(sorted);
  };

  useEffect(() => { fetchRides(); }, []);

  const handleBook = async (ride: any) => {
    if (!user) { window.location.href = '/login'; return; }
    if (user.wallet < ride.price) { alert("Insufficient funds in wallet!"); return; }
    
    setBookingId(ride._id);
    try {
        const token = localStorage.getItem('velora_token');
        const res = await fetch('http://localhost:5000/api/rides/book', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ rideId: ride._id })
        });
        const data = await res.json();
        if (data.success) {
            alert("Booking Successful! Your seat is reserved.");
            await refreshUser();
            fetchRides();
        } else {
            alert(data.error || "Booking failed.");
        }
    } catch (e) {
        alert("Network error.");
    } finally {
        setBookingId(null);
    }
  };

  return (
    <div className="min-h-screen pt-32 px-6 bg-slate-950 text-white pb-24 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-6">
                <Link href="/" className="w-12 h-12 flex items-center justify-center bg-slate-900 border border-white/5 rounded-2xl hover:bg-slate-800 transition-colors">
                    <ArrowLeft size={20} className="text-white" />
                </Link>
                <div>
                    <h1 className="text-5xl font-black tracking-tighter">Live Rides</h1>
                    <p className="text-slate-500 font-medium text-lg">Secure your journey across the Velora network.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <button className="bg-indigo-500/10 text-indigo-400 px-6 py-3 rounded-2xl border border-indigo-500/20 font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500/20 transition-all" onClick={fetchRides}>
                    Refresh Grid
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-[700px]">
          <aside className="lg:col-span-3 space-y-8">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <Navigation size={20} className="text-indigo-500" /> Advanced Filter
                </h3>
                <div className="space-y-5">
                    <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 ml-1">Origin</p>
                        <input type="text" placeholder="Current location" className="w-full bg-slate-950/50 border border-white/5 p-4 rounded-2xl text-sm focus:border-indigo-500/50 outline-none transition-all" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 ml-1">Destination</p>
                        <input type="text" placeholder="Where to?" className="w-full bg-slate-950/50 border border-white/5 p-4 rounded-2xl text-sm focus:border-indigo-500/50 outline-none transition-all" />
                    </div>
                    <div className="pt-4">
                        <button className="btn-primary w-full py-4 text-xs" onClick={fetchRides}>Search Network</button>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block h-[450px] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                <MapComponent 
                    center={mapCenter} 
                    zoom={mapZoom} 
                    markers={rides.map(r => ({ lat: r.from?.lat, lng: r.from?.lng, label: `${r.driverName}'s Pickup` }))} 
                />
            </div>
          </aside>

          <main className="lg:col-span-9 space-y-6">
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-900/30 animate-pulse rounded-[2.5rem] border border-white/5"></div>)}
                </div>
            ) : rides.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {rides.map(ride => (
                        <RideCard 
                            key={ride._id} 
                            ride={ride} 
                            bookingId={bookingId} 
                            onBook={() => handleBook(ride)} 
                            onHover={() => {
                                if (ride.from?.lat) {
                                    setMapCenter([ride.from.lat, ride.from.lng]);
                                    setMapZoom(12);
                                }
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-[3rem] text-center py-32 space-y-8">
                    <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5 opacity-50">
                        <Zap size={48} className="text-slate-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">No Active Journeys</h3>
                        <p className="text-slate-500 font-medium">Be the first to offer a ride on this route!</p>
                    </div>
                    <Link href="/post" className="btn-primary inline-flex mt-6 px-10">Offer a Ride</Link>
                </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function RideCard({ ride, bookingId, onBook, onHover }: any) {
    const getVehicleIcon = () => {
        if (ride.vehicleType?.includes('XL')) return <Users size={22} className="text-indigo-400" />;
        if (ride.vehicleType?.includes('Prime')) return <Zap size={22} className="text-purple-400" />;
        return <Car size={22} className="text-slate-500" />;
    };

    return (
        <div 
            onMouseEnter={onHover}
            className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] hover:bg-slate-800/60 hover:border-white/10 transition-all group flex flex-col justify-between shadow-xl relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-10 relative z-10">
                <div className="flex gap-5">
                    <div className="w-16 h-16 bg-slate-950 text-indigo-400 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner border border-white/5 group-hover:scale-105 transition-transform">
                        {ride.driverName?.[0] || 'V'}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-black text-xl text-white tracking-tight">{ride.driverName}</h4>
                            <div className="flex items-center text-[10px] text-indigo-400 font-black bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                <Star size={10} fill="currentColor" className="mr-1" /> 
                                {ride.driverRating > 0 ? ride.driverRating.toFixed(1) : "NEW"} 
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {getVehicleIcon()}
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em]">{ride.vehicleType || 'Velora Go'}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-black text-white tracking-tighter text-glow">₹{ride.price}</div>
                    <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1">ESTIMATED FARE</p>
                </div>
            </div>

            <div className="space-y-5 mb-10 relative z-10 bg-slate-950/30 p-5 rounded-3xl border border-white/5">
                <div className="flex items-start gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Pickup</p>
                        <span className="text-sm text-slate-300 font-medium truncate block max-w-[200px]">{ride.from?.address}</span>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                    <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Destination</p>
                        <span className="text-sm text-slate-300 font-medium truncate block max-w-[200px]">{ride.to?.address}</span>
                    </div>
                </div>
            </div>

            <button 
                onClick={onBook}
                disabled={bookingId === ride._id}
                className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] relative z-10 disabled:opacity-50 group/btn"
            >
                {bookingId === ride._id ? (
                  <span className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Securing Seat...
                  </span>
                ) : 'Confirm Booking'}
            </button>
        </div>
    );
}
