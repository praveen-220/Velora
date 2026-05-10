"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { History, MessageCircle, MapPin, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export default function ActivityPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        fetch(`http://localhost:5000/api/bookings/${user._id}`)
            .then(res => res.json())
            .then(data => { setBookings(data); setLoading(false); })
            .catch(() => setLoading(false));
    }
  }, [user]);

  if (!user) return <div className="min-h-screen pt-32 text-center bg-slate-950 text-slate-500 font-black uppercase tracking-[0.2em]">Please login to view activity.</div>;

  return (
    <div className="min-h-screen pt-32 px-6 pb-24 bg-slate-950 text-white selection:bg-indigo-500/30">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
                <h1 className="text-5xl font-black mb-3 tracking-tighter flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                        <History size={28} className="text-white" />
                    </div>
                    Activity Hub
                </h1>
                <p className="text-slate-500 font-medium text-lg">Track your journeys across the Velora network.</p>
            </div>
            <div className="flex gap-4">
                <div className="px-6 py-3 bg-slate-900/50 border border-white/5 rounded-2xl">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Trips</div>
                    <div className="text-2xl font-black text-white">{bookings.length}</div>
                </div>
            </div>
        </header>

        <div className="space-y-8">
            {loading ? (
                <div className="space-y-6">
                    {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-900/30 animate-pulse rounded-[2.5rem] border border-white/5"></div>)}
                </div>
            ) : bookings.length > 0 ? (
                bookings.map((booking, idx) => (
                    <div key={booking._id} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 hover:bg-slate-800/60 hover:border-white/10 transition-all group shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                        <div className="flex flex-col lg:flex-row justify-between gap-10">
                            <div className="flex-1 space-y-8">
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-full uppercase flex items-center gap-2 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                        <CheckCircle2 size={14} /> Journey Completed
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full">
                                        <Clock size={14} className="text-indigo-500" /> {new Date(booking.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                    <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5 flex-1 w-full">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                            <MapPin size={20} className="text-indigo-400" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Pickup</p>
                                            <p className="font-bold text-white truncate">{booking.rideId?.from?.address || 'Premium Pickup'}</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex flex-col items-center gap-1 opacity-20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                        <div className="w-1 h-1 rounded-full bg-indigo-500/60"></div>
                                        <div className="w-0.5 h-0.5 rounded-full bg-indigo-500/40"></div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5 flex-1 w-full">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                            <MapPin size={20} className="text-purple-400" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Destination</p>
                                            <p className="font-bold text-white truncate">{booking.rideId?.to?.address || 'Premium Dropoff'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                        {booking.rideId?.driverName?.[0] || 'V'}
                                    </div>
                                    <p className="text-sm text-slate-400 font-bold">Partnered with <span className="text-white">{booking.rideId?.driverName || 'Verified Professional'}</span></p>
                                </div>
                            </div>
                            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-6 lg:min-w-[200px] lg:border-l lg:border-white/5 lg:pl-10">
                                <div className="text-4xl font-black text-white tracking-tighter text-glow">₹{booking.fare}</div>
                                <Link href={`/chat/${booking.rideId?._id}`} className="btn-primary py-4 px-8 text-xs flex items-center gap-3 group/btn">
                                    <MessageCircle size={18} className="group-hover:scale-110 transition-transform" /> Open Secure Chat
                                </Link>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-[3rem] text-center py-32 space-y-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5 opacity-50">
                        <History size={40} className="text-slate-500" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Active History</h4>
                        <p className="text-slate-500 font-medium">Your future journeys await in the Velora network.</p>
                    </div>
                    <Link href="/search" className="btn-accent inline-flex mt-6">Explore Rides</Link>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
