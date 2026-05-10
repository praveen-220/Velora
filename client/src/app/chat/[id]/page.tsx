"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Send, User, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ChatPage() {
  const { id: rideId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<any>(null);
  const router = useRouter();

  const fetchMessages = () => {
    fetch(`http://localhost:5000/api/chat/${rideId}`)
      .then(res => res.json())
      .then(setMessages);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Fixed typo from fetchRides to fetchMessages
    return () => clearInterval(interval);
  }, [rideId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: any) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = { rideId, senderId: user?._id, text };
    await fetch(`http://localhost:5000/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
    });
    setText("");
    fetchMessages();
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white selection:bg-indigo-500/30">
      <header className="p-6 bg-slate-900/40 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between sticky top-0 z-[110] shadow-2xl">
        <div className="flex items-center gap-5">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-slate-950 border border-white/5 rounded-xl hover:bg-slate-800 transition-colors">
                <ArrowLeft size={18} />
            </button>
            <div>
                <h2 className="text-xl font-black tracking-tight">Ride Coordinator</h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.15em]">
                         Secure Node Active
                    </p>
                </div>
            </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
            <div className="p-5 bg-white/5 rounded-full border border-white/5">
                <ShieldCheck size={40} className="text-slate-500" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Beginning secure session...</p>
          </div>
        )}
        {messages.map((m, i) => (
            <div key={i} className={`flex ${m.senderId === user?._id ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[75%] p-5 rounded-[2rem] text-sm font-medium shadow-2xl relative ${m.senderId === user?._id ? 'bg-indigo-600 text-white rounded-tr-none border border-indigo-500/50' : 'bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-tl-none text-slate-200'}`}>
                    {m.text}
                    <div className={`text-[8px] mt-2 font-black uppercase tracking-widest opacity-60 ${m.senderId === user?._id ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>
        ))}
        <div ref={scrollRef} />
      </main>

      <footer className="p-8 bg-slate-950 border-t border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-4">
            <div className="flex-1 relative group">
                <input 
                    type="text" 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Communicate with your partner..."
                    className="w-full bg-slate-900/50 border border-white/5 p-5 pr-14 rounded-2xl text-sm font-bold focus:border-indigo-500/50 outline-none transition-all shadow-inner"
                />
            </div>
            <button type="submit" className="btn-primary p-5 rounded-2xl shadow-xl shadow-indigo-600/20 group hover:scale-[1.05] active:scale-95 transition-all">
                <Send size={20} className="group-hover:rotate-12 transition-transform" />
            </button>
        </form>
      </footer>
    </div>
  );
}
