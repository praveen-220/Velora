"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Home, Search, PlusCircle, History, Wallet, User, Bell } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user && pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-slate-950/40 backdrop-blur-3xl border-t md:border-b border-white/5 z-[100] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="hidden md:flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] group-hover:scale-110 transition-transform duration-500">
            <img src="/logo.png" alt="Velora Logo" className="h-5 brightness-200" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">VELORA.</span>
        </Link>

        <div className="flex flex-1 justify-around md:justify-center md:gap-4 items-center">
          <NavLink href="/dashboard" icon={<Home size={20} />} label="Dashboard" active={pathname === '/dashboard'} />
          <NavLink href="/search" icon={<Search size={20} />} label="Search" active={pathname === '/search'} />
          <NavLink href="/post" icon={<PlusCircle size={20} />} label="Offer" active={pathname === '/post'} />
          <NavLink href="/activity" icon={<History size={20} />} label="Activity" active={pathname === '/activity'} />
          <NavLink href="/wallet" icon={<Wallet size={20} />} label="Wallet" active={pathname === '/wallet'} />
        </div>

        <div className="hidden md:flex items-center gap-6">
          <button className="p-2.5 text-slate-400 hover:text-white transition-colors relative group">
            <Bell size={22} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
          </button>
          <Link href="/profile" className="w-11 h-11 bg-slate-900 border border-white/10 text-white rounded-2xl flex items-center justify-center font-black hover:border-indigo-500/50 hover:bg-slate-800 transition-all shadow-xl group">
            <span className="group-hover:scale-110 transition-transform">{user?.name?.[0] || 'V'}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col md:flex-row items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all duration-300 ${active ? 'text-white bg-indigo-600/20 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
      <div className={`${active ? 'text-indigo-400' : ''}`}>{icon}</div>
      <span className={`text-[9px] md:text-sm font-black uppercase tracking-[0.15em] md:normal-case md:tracking-normal ${active ? 'text-white' : ''}`}>{label}</span>
    </Link>
  );
}
