import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Coins, FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-campus-950 text-cream-100/70 mt-10">
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-8">
        <div>
          <p className="flex items-center gap-2 font-display font-black text-xl text-cream-50">
            <span className="w-8 h-8 rounded-lg coin-shine flex items-center justify-center text-white"><GraduationCap size={17} /></span>
            Campus<span className="text-amber-400">Mart</span>
          </p>
          <p className="text-sm mt-2 font-medium">Student marketplace + auctions powered by Campus Coins. Virtual currency only — no real money, ever.</p>
          <p className="text-xs mt-2 font-bold flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-400" /> Backend-validated trades · ownership enforced</p>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-cream-100/50">Marketplace</p>
          <div className="flex flex-col gap-1.5 mt-2 text-sm font-bold">
            <Link to="/market" className="hover:text-amber-300">Browse products</Link>
            <Link to="/auctions" className="hover:text-amber-300">Live auctions</Link>
            <Link to="/shop" className="hover:text-amber-300">Virtual shop</Link>
            <Link to="/leaderboard" className="hover:text-amber-300">Leaderboard</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-cream-100/50">Earn coins</p>
          <div className="flex flex-col gap-1.5 mt-2 text-sm font-bold">
            <Link to="/coins" className="hover:text-amber-300 flex items-center gap-1"><Coins size={13} /> Daily +25 reward</Link>
            <Link to="/coins" className="hover:text-amber-300">Tasks & referrals (+50)</Link>
            <Link to="/coins" className="hover:text-amber-300">Peer transfers</Link>
            <Link to="/sell" className="hover:text-amber-300">Sell & earn</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-cream-100/50">Demo accounts</p>
          <div className="mt-2 text-xs font-mono bg-white/5 border border-white/10 rounded-xl p-3 leading-relaxed">
            buyer@campusmart.demo<br />seller@campusmart.demo<br />admin@campusmart.demo<br />
            <span className="text-amber-300">password: demo1234</span>
          </div>
          <p className="text-[11px] mt-2 flex items-center gap-1"><FileText size={12} /> See README.md for setup, seeding & test flows.</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-1 items-center justify-between text-[11px] font-semibold">
          <span>© 2026 Campus Mart · Built for students, by students · Coins are virtual</span>
          <span>🔒 Guests browse · prices unlock on login · sellers own their listings</span>
        </div>
      </div>
    </footer>
  );
}
