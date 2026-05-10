"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, User, ShieldCheck, LogOut, History, CreditCard, ChevronRight, Settings, HelpCircle, MapPin, Star, Wallet, Gift, MessageSquare } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function ProfilePage() {
  const { user, profile, loading, refreshUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || "");
      setEditPhone(profile.phone || "");
    }
  }, [profile]);

  const saveProfile = async () => {
    setLoadingUpdate(true);
    try {
      const token = localStorage.getItem('velora_token');
      const res = await fetch("http://localhost:5000/api/auth/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, phone: editPhone })
      });
      if (res.ok) {
        await refreshUser();
        setIsEditing(false);
      } else {
        alert("Failed to update profile");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleTopUp = async () => {
    try {
      const token = localStorage.getItem('velora_token');
      const res = await fetch("http://localhost:5000/api/auth/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount: 500 }) // Add 500 each time
      });
      if (res.ok) {
        await refreshUser();
      }
    } catch (e) {
      alert("Top up failed");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  if (!profile) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-6">
      <div className="w-20 h-20 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center mb-8 opacity-50">
        <User size={48} className="text-slate-500" />
      </div>
      <h2 className="text-3xl font-black mb-3 tracking-tighter">Identity Not Verified</h2>
      <p className="text-slate-500 mb-10 text-center max-w-xs font-medium">Please authenticate to access your premium profile and network settings.</p>
      <Link href="/login" className="btn-primary px-12 py-4">
        Authenticate Now
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* Top Bar Navigation */}
      <div className="pt-10 pb-6 px-8 sticky top-0 bg-slate-950/60 backdrop-blur-3xl z-[100] border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-6">
            <Link href="/dashboard" className="w-12 h-12 flex items-center justify-center bg-slate-900 border border-white/5 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl">
                <ArrowLeft size={22} className="text-white" />
            </Link>
            <h2 className="text-xl font-black tracking-tight">Identity & Vault</h2>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 pt-12">
        
        {/* Profile Card */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-10 rounded-[2.5rem] mb-12 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/10 transition-all duration-1000"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                <div className="flex-1 space-y-4">
                    {isEditing ? (
                    <div className="space-y-4 w-full">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-white focus:border-indigo-500/50 outline-none transition-all"
                                placeholder="Full Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Phone Identifier</label>
                            <input 
                                type="text" 
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all"
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={saveProfile}
                                className="btn-primary px-8 py-3 text-xs"
                            >
                                {loadingUpdate ? "Syncing..." : "Commit Changes"}
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="px-8 py-3 bg-slate-800 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                    ) : (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <h1 className="text-5xl font-black mb-3 tracking-tighter text-glow leading-none">{profile.name}</h1>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                <Star size={12} className="fill-indigo-500 text-indigo-500" />
                                <span>{profile.rating > 0 ? profile.rating.toFixed(1) : "NEW"} RATING</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{profile.phone || "No Identifier"}</p>
                        </div>
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-400 mt-6 uppercase tracking-[0.2em] transition-colors group"
                        >
                            <Settings size={14} className="group-hover:rotate-90 transition-transform duration-500" />
                            Refine Profile
                        </button>
                    </div>
                    )}
                </div>

                {!isEditing && (
                    <div className="w-24 h-24 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-center text-4xl font-black text-slate-500 shrink-0 shadow-inner group-hover:border-indigo-500/30 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <User size={48} className="text-slate-700 group-hover:text-indigo-400 transition-colors relative z-10" />
                    </div>
                )}
            </div>
        </div>

        {/* Action Pills */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between h-40 shadow-xl hover:bg-slate-800/60 transition-all group">
            <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <Wallet size={24} />
                </div>
                <button onClick={handleTopUp} className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">Top Up</button>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Network Balance</p>
                <p className="text-2xl font-black text-white tracking-tight">₹{profile.wallet !== undefined ? profile.wallet : "0"}</p>
            </div>
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between h-40 shadow-xl hover:bg-slate-800/60 transition-all group">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <History size={24} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Journey Activity</p>
                <p className="text-2xl font-black text-white tracking-tight">{profile.trips !== undefined ? profile.trips : "0"} <span className="text-slate-500 text-sm font-bold ml-1 uppercase">Sessions</span></p>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="space-y-3 mb-12">
          <MenuItem icon={<MapPin size={22} />} label="Operational Zones" desc="Manage saved locations" />
          <MenuItem icon={<CreditCard size={22} />} label="Vault Settings" desc="Payment methods & cards" />
          <MenuItem icon={<Gift size={22} />} label="Incentives" desc="Network rewards & promos" />
          <div className="h-4"></div>
          <MenuItem icon={<ShieldCheck size={22} />} label="Security Hub" desc="Privacy & verification" />
          <MenuItem icon={<MessageSquare size={22} />} label="Comm Center" desc="Direct communications" />
          <MenuItem icon={<HelpCircle size={22} />} label="Support Node" desc="Network assistance" />
        </div>

        <button 
          onClick={logout}
          className="w-full py-6 flex items-center justify-center gap-3 bg-red-500/5 border border-red-500/10 rounded-3xl font-black text-red-500 uppercase tracking-[0.3em] hover:bg-red-500/10 transition-all active:scale-[0.98] mb-12"
        >
          <LogOut size={20} />
          Terminate Session
        </button>
        
        <div className="text-center opacity-30">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Velora System Interface v2.6.4_STABLE</p>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, desc, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-6 bg-slate-900/30 border border-white/5 rounded-3xl hover:bg-slate-900/60 hover:border-white/10 transition-all text-left group shadow-sm">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:bg-slate-900 transition-all border border-white/5">
          {icon}
        </div>
        <div>
            <span className="font-black text-white text-lg tracking-tight block leading-none mb-1">{label}</span>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{desc}</span>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
    </button>
  );
}
