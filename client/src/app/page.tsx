import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/bg.png" 
            alt="Velora Home Background" 
            fill
            className="object-cover object-center opacity-20 mix-blend-luminosity"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/40 to-slate-950"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-4 animate-in fade-in slide-in-from-top-4 duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Next-Gen Mobility is Here
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Ride<span className="text-indigo-500">.</span>
            Share<span className="text-indigo-500">.</span>
            Save
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">
            Velora is the future of smart mobility. Connect with verified partners and experience premium ride sharing across India.
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center pt-8 animate-in fade-in zoom-in duration-1000 delay-300">
            <Link href="/search" className="btn-primary text-lg w-full md:w-auto px-12 py-4">Find a Ride</Link>
            <Link href="/post" className="btn-accent text-lg w-full md:w-auto px-12 py-4">Offer a Ride</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Why Choose Velora?</h2>
            <div className="w-24 h-1.5 bg-indigo-500 mx-auto rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)]"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <FeatureCard 
              icon="🛡️"
              title="Verified Partners"
              desc="Every driver is background checked and verified for your total safety."
            />
            <FeatureCard 
              icon="💰"
              title="Best Fares"
              desc="Save up to 40% compared to traditional cabs with our sharing engine."
            />
            <FeatureCard 
              icon="🌍"
              title="Eco Friendly"
              desc="Reduce your carbon footprint by sharing seats and optimizing routes."
            />
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-20 border-t border-white/5 px-6 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
               <img src="/logo.png" alt="Velora Logo" className="h-5 brightness-200" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">VELORA.</span>
          </div>
          <div className="text-slate-500 text-sm font-medium">© 2026 Velora Mobility Network. All rights reserved.</div>
          <div className="flex space-x-8 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            <Link href="#" className="hover:text-indigo-400 transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-indigo-400 transition-colors">Instagram</Link>
            <Link href="#" className="hover:text-indigo-400 transition-colors">LinkedIn</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="glass-card hover:bg-white/5 hover:-translate-y-2 transition-all duration-500 group border-white/5 hover:border-indigo-500/30">
      <div className="text-6xl mb-8 group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <h3 className="text-2xl font-black mb-4 text-white group-hover:text-indigo-400 transition-colors">{title}</h3>
      <p className="text-slate-400 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
