"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Wallet, Navigation, Star, TrendingUp, ShieldCheck, Car, Zap, User, Users, Activity } from "lucide-react";

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/rides')
      .then(res => res.json())
      .then(data => {
        setRides(data.slice(0, 3)); // Show top 3 nearby
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (profile?.role === 'admin') {
      const token = localStorage.getItem('velora_token');
      fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setAdminStats(data))
      .catch(err => console.error("Admin stats fetch failed", err));
    }
  }, [profile]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  
  if (!profile) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 shadow-2xl mb-4">
                <User size={32} className="text-slate-500" />
            </div>
            <p className="text-slate-400 font-medium">Secure session not found.</p>
            <Link href="/login" className="btn-primary py-3 px-8 text-sm">Return to Login</Link>
        </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 px-6 bg-slate-950 text-white font-sans pb-24 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto">
        <header className="space-y-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-5xl font-black tracking-tight mb-2">
                Welcome, <span className="text-indigo-400">{profile.name?.split(' ')[0] || 'Member'}</span>
              </h1>
              <p className="text-slate-500 text-lg font-medium">Your premium mobility hub is ready.</p>
            </div>
            <Link href="/wallet" className="py-2.5 px-5 flex items-center gap-4 bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-full hover:bg-slate-800 hover:border-white/10 transition-all group shadow-xl">
               <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:scale-110 transition-transform">
                  <Wallet size={18} />
               </div>
               <span className="text-xl font-black text-white pr-2 tracking-tight">₹{profile.wallet !== undefined ? profile.wallet : '0'}</span>
            </Link>
          </div>

          <div className="relative group">
            <Link href="/search" className="relative p-8 flex items-center gap-6 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl hover:bg-slate-800/60 transition-all cursor-pointer group shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg relative z-10">
                    <Navigation size={28} />
                </div>
                <span className="text-3xl font-black text-white relative z-10 tracking-tight">Where to?</span>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-16">
            <div className="grid grid-cols-3 gap-6">
              <QuickAction href="/search" title="Ride" icon={<Navigation size={32} />} />
              <QuickAction href="/post" title="Offer" icon={<TrendingUp size={32} />} />
              <QuickAction href="/activity" title="Activity" icon={<Star size={32} />} />
            </div>

            <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Zap size={24} className="text-indigo-400" /> Nearby Rides
                </h3>
                <Link href="/search" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">View All</Link>
              </div>
              <div className="grid gap-5">
                {loading ? (
                    [1,2].map(i => <div key={i} className="h-28 bg-slate-900/50 rounded-3xl animate-pulse border border-white/5"></div>)
                ) : rides.length > 0 ? (
                    rides.map(ride => (
                        <Link href="/search" key={ride._id} className="flex items-center justify-between p-6 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl hover:bg-slate-800/60 hover:border-white/10 transition-all group shadow-lg">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-slate-950 text-indigo-400 rounded-2xl flex items-center justify-center font-black shadow-inner border border-white/5 text-2xl group-hover:scale-105 transition-transform">
                                    {ride.driverName?.[0] || 'V'}
                                </div>
                                <div>
                                    <div className="font-black text-xl leading-tight text-white mb-1">{ride.driverName}</div>
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Car size={12} className="text-indigo-500" /> {ride.vehicleType || 'Velora Go'}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-white tracking-tighter">₹{ride.price}</div>
                                <div className="text-[10px] text-indigo-500/70 font-black uppercase tracking-widest">Live Now</div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="text-center py-16 bg-slate-900/20 rounded-3xl border border-dashed border-white/10 text-slate-500 font-bold">No live rides in your immediate vicinity.</div>
                )}
              </div>
            </section>

            {profile.role === 'admin' && adminStats && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 border-t border-white/5">
                <div className="flex items-center gap-3 mb-8">
                  <h3 className="text-2xl font-black text-indigo-400">Admin Command Center</h3>
                  <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-indigo-500/20">Master Access</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <AdminStatCard icon={<Users size={24} />} label="Total Users" value={adminStats.totalUsers} color="text-indigo-400" />
                  <AdminStatCard icon={<Car size={24} />} label="Total Rides" value={adminStats.totalRides} color="text-emerald-400" />
                  <AdminStatCard icon={<Activity size={24} />} label="Active Now" value={adminStats.activeRides} color="text-orange-400" />
                  <AdminStatCard icon={<Wallet size={24} />} label="Gross Volume" value={`₹${adminStats.totalVolume}`} color="text-fuchsia-400" />
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-10">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
              <h3 className="text-xl font-black mb-10 flex items-center gap-3 text-white">
                <Star size={20} className="text-indigo-500 fill-indigo-500" /> Trust Network
              </h3>
              <div className="space-y-8">
                <StatRow label="Global Rating" value={profile.rating > 0 ? `${profile.rating.toFixed(1)} ★` : 'New'} />
                <StatRow label="Verified Status" value={profile.role === 'admin' ? 'Master' : 'Certified'} color="text-indigo-400" />
                <StatRow label="Total Trips" value={`${profile.trips !== undefined ? profile.trips : 0} rides`} />
              </div>
            </div>

            <div className="p-10 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-lg border border-white/10 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 border border-white/10">
                        <ShieldCheck size={28} className="text-indigo-400" />
                    </div>
                    <h4 className="font-black text-xl mb-3 text-white">Safety Shield Active</h4>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">
                        Your journeys are protected by Velora's end-to-end encrypted tracking and SOS network.
                    </p>
                </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, title, icon }: any) {
  return (
    <Link href={href} className="group flex flex-col items-center gap-4">
        <div className="w-full aspect-square bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl flex flex-col items-center justify-center text-slate-400 group-hover:bg-slate-800/60 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all duration-300 shadow-lg">
            <div className="group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                {icon}
            </div>
        </div>
        <span className="text-sm font-black text-slate-500 group-hover:text-white uppercase tracking-widest transition-colors">{title}</span>
    </Link>
  );
}

function StatRow({ label, value, color }: any) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 font-medium">{label}</span>
            <span className={`text-lg font-bold ${color || 'text-black'}`}>{value}</span>
        </div>
    );
}

function AdminStatCard({ icon, label, value, color }: any) {
  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all">
      <div className={`mb-3 ${color}`}>{icon}</div>
      <div className="text-2xl font-black text-black">{value}</div>
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}
