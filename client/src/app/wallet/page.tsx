"use client";
import { useAuth } from "@/context/AuthContext";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function WalletPage() {
  const { user } = useAuth();

  if (!user) return <div className="min-h-screen pt-32 text-center bg-slate-950 text-slate-500 font-black uppercase tracking-[0.2em]">Please login to view wallet.</div>;

  return (
    <div className="min-h-screen pt-32 px-6 pb-24 bg-slate-950 text-white selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-12 rounded-[2.5rem] mb-12 overflow-hidden relative group shadow-2xl">
            {/* Animated Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] group-hover:bg-indigo-500/20 transition-all duration-700"></div>
            
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                <WalletIcon size={160} className="text-white" />
            </div>
            
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-indigo-500/20 mb-6">
                    Velora Financial Card
                </div>
                <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">Available Balance</p>
                <h2 className="text-7xl font-black mb-12 tracking-tighter text-glow">₹{user.wallet || 0}</h2>
                <div className="flex flex-wrap gap-4">
                    <button className="btn-primary py-4 px-10 text-sm flex items-center gap-3">
                        <Plus size={18} /> Add Funds
                    </button>
                    <button className="bg-slate-950/50 hover:bg-slate-800 border border-white/10 py-4 px-10 text-sm rounded-full transition-all font-black uppercase tracking-widest text-slate-300 hover:text-white hover:border-white/20 active:scale-95">
                        Withdraw
                    </button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl flex items-center gap-6 shadow-xl hover:border-white/10 transition-all">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <ArrowDownLeft size={28} />
                </div>
                <div>
                    <h4 className="font-black text-2xl text-emerald-400">₹1,500</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Welcome Bonus</p>
                </div>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl flex items-center gap-6 shadow-xl hover:border-white/10 transition-all">
                <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                    <ArrowUpRight size={28} />
                </div>
                <div>
                    <h4 className="font-black text-2xl text-indigo-400">₹0</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Total Spent</p>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black flex items-center gap-3">
                Transaction History
            </h3>
            <div className="h-px flex-1 bg-white/5 mx-6"></div>
        </div>

        <div className="space-y-4">
            <div className="bg-slate-900/30 backdrop-blur-md border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-slate-900/50 transition-all">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <p className="font-black text-white">Platform Credit</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">System Initialization</p>
                    </div>
                </div>
                <div className="text-emerald-400 font-black text-xl tracking-tight">+₹1,500</div>
            </div>
            
            <div className="text-center py-16 border border-dashed border-white/5 rounded-[2rem]">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60">
                    Securely synced with Velora Financial Network.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
