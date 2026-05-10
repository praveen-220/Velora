"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, User as UserIcon, Zap } from "lucide-react";

export default function LoginPage() {
  const [step, setStep] = useState(1); // 1: Identity, 2: OTP
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
        const res = await fetch('http://localhost:5000/api/auth/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            setStep(2);
        } else {
            setError(data.error || "Failed to deliver access code.");
        }
    } catch (err) {
        setError("Network error. Ensure backend is active.");
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
        const res = await fetch('http://localhost:5000/api/auth/email/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, name: !isLogin ? name : undefined })
        });
        const data = await res.json();
        if (data.success) {
            login(data.token, data.user);
            window.location.href = '/dashboard'; 
        } else {
            setError("Invalid or expired access code.");
        }
    } catch (err) {
        setError("Verification failed.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-white font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 animate-pulse delay-700"></div>

      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative z-10">
        <div className="max-w-md w-full mx-auto animate-in fade-in slide-in-from-left-8 duration-1000">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3 mb-16 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] group-hover:scale-110 transition-transform duration-500">
                <Image src="/logo.png" alt="Velora Logo" width={24} height={24} className="brightness-200" priority />
            </div>
            <span className="text-3xl font-black tracking-tighter text-white">VELORA.</span>
          </Link>

          <h1 className="text-5xl font-black mb-4 tracking-tighter text-glow">
            {step === 1 ? (isLogin ? "Welcome back" : "Join the network") : "Identity verification"}
          </h1>
          <p className="text-slate-500 mb-10 font-medium text-lg leading-relaxed">
            {step === 1 
              ? (isLogin ? "Access your premium ride-sharing account." : "Start your journey with Velora today.") 
              : `A secure 6-digit access code has been dispatched to ${email}`}
          </p>

          {error && (
            <div className="mb-8 p-5 bg-red-500/10 text-red-400 text-sm font-black rounded-2xl border border-red-500/20 flex items-center gap-3 animate-in shake duration-500">
              <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Zap size={14} />
              </div>
              {error}
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSendOTP}>
              {/* Tabs */}
              <div className="flex p-1.5 bg-slate-900 border border-white/5 rounded-[1.25rem] mb-10 shadow-inner">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${!isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Create Account
                </button>
              </div>

              {!isLogin && (
                <div className="space-y-3 group">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Display Name</label>
                  <div className="relative">
                    <UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      type="text" required={!isLogin}
                      value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name" 
                      className="w-full bg-slate-900/50 border border-white/5 focus:border-indigo-500/50 p-5 pl-14 rounded-2xl text-white font-bold outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 group">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Secure Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com" 
                    className="w-full bg-slate-900/50 border border-white/5 focus:border-indigo-500/50 p-5 pl-14 rounded-2xl text-white font-bold outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading || !email || (!isLogin && !name)}
                className="btn-primary w-full py-5 text-lg font-black tracking-tight flex items-center justify-center gap-3 disabled:opacity-50 mt-10 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing Request...
                  </>
                ) : (
                  <>
                    Secure Access
                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form className="space-y-10" onSubmit={handleVerifyOTP}>
              <div className="space-y-6">
                <div className="relative">
                    <input 
                      type="text" maxLength={6} required
                      value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-slate-950 border border-indigo-500/30 focus:border-indigo-500 p-8 rounded-3xl text-center text-6xl font-black text-white tracking-[0.4em] outline-none transition-all shadow-[0_0_40px_rgba(99,102,241,0.1)] focus:shadow-[0_0_60px_rgba(99,102,241,0.2)]"
                    />
                </div>
              </div>
              <div className="space-y-4">
                <button 
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="btn-primary w-full py-5 text-xl font-black tracking-tight flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-indigo-600/20"
                >
                    {loading ? "Verifying Token..." : "Authenticate"}
                    <ArrowRight size={24} />
                </button>
                <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-xs font-black text-slate-500 hover:text-indigo-400 uppercase tracking-[0.2em] transition-colors py-4"
                >
                    Switch Identity
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-[10px] text-slate-600 font-black uppercase tracking-[0.1em] mt-16 leading-relaxed">
            By authenticating, you agree to our <br/>
            <Link href="#" className="text-indigo-500 hover:text-indigo-400 transition-colors">Terms of Operations</Link> & <Link href="#" className="text-indigo-500 hover:text-indigo-400 transition-colors">Privacy Protocol</Link>.
          </p>
        </div>
      </div>

      {/* Right Column: Visual Section */}
      <div className="hidden lg:block lg:w-1/2 relative bg-slate-900 border-l border-white/5 overflow-hidden">
        <Image 
          src="/bg.png" 
          alt="Velora Background" 
          fill
          className="object-cover object-center opacity-30 mix-blend-luminosity scale-110 animate-slow-zoom"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/40 to-indigo-600/10"></div>
        
        {/* Dynamic Element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-12">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:rotate-12 transition-transform duration-1000">
                    <Zap size={120} className="text-indigo-500" />
                </div>
                <div className="w-16 h-1 bg-indigo-500 rounded-full"></div>
                <h2 className="text-5xl font-black leading-[1.1] tracking-tighter">Premium Mobility.<br/>Shared Future.</h2>
                <p className="text-xl text-slate-400 font-medium leading-relaxed">Experience the highest standard of shared transit across India's growing network.</p>
                <div className="flex gap-4 pt-4">
                    <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300">Verified Fleet</div>
                    <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300">Secure Vault</div>
                </div>
            </div>
        </div>

        <div className="absolute bottom-12 left-12 flex items-center gap-4">
            <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[10px] font-black overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                    </div>
                ))}
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">+10k Partners Live</p>
        </div>
      </div>
    </div>
  );
}
