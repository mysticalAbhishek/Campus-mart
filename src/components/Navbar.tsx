import { Link, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, Coins, Menu, X, Gavel, Store, Trophy, ShoppingBag, LayoutDashboard, ShieldCheck, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../lib/store';
import { CoinPill } from './ui';

const links = [
  { to: '/market', label: 'Marketplace', icon: Store },
  { to: '/auctions', label: 'Auctions', icon: Gavel },
  { to: '/coins', label: 'Coins', icon: Coins },
  { to: '/shop', label: 'Shop', icon: ShoppingBag },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export default function Navbar() {
  const { user, logout, setAuthOpen } = useStore();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-campus-950 text-cream-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 h-16">
          <Link to="/" className="flex items-center gap-2 font-display font-black text-xl tracking-tight">
            <span className="w-9 h-9 rounded-xl coin-shine flex items-center justify-center text-white shadow-lg">
              <GraduationCap size={20} />
            </span>
            Campus<span className="text-amber-400">Mart</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-bold transition ${isActive ? 'bg-white/15 text-amber-300' : 'text-cream-100/80 hover:text-white hover:bg-white/10'}`}>
                {l.label}
              </NavLink>
            ))}
            {user && (user.role === 'seller' || user.role === 'admin') && (
              <NavLink to="/sell" className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-bold transition ${isActive ? 'bg-white/15 text-amber-300' : 'text-cream-100/80 hover:text-white hover:bg-white/10'}`}>Sell</NavLink>
            )}
            {user && (
              <NavLink to="/dashboard" className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1 ${isActive ? 'bg-white/15 text-amber-300' : 'text-cream-100/80 hover:text-white hover:bg-white/10'}`}>
                <LayoutDashboard size={14} /> Dashboard
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1 ${isActive ? 'bg-red-500/30 text-red-200' : 'text-red-200/80 hover:text-white hover:bg-red-500/20'}`}>
                <ShieldCheck size={14} /> Admin
              </NavLink>
            )}
          </nav>

          <div className="flex-1" />

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <CoinPill />
              <span className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 rounded-full pl-1 pr-2 py-1">
                <span className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center">{user.avatar_emoji}</span>
                <span className="max-w-[110px] truncate">{user.display_name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase ${user.role === 'admin' ? 'bg-red-500 text-white' : user.role === 'seller' ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white'}`}>{user.role}</span>
              </span>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-white/10" title="Log out"><LogOut size={16} /></button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] text-cream-100/60 font-semibold bg-white/5 rounded-full px-3 py-1.5">Browsing as guest · prices hidden</span>
              <button onClick={() => setAuthOpen(true)} className="rounded-xl bg-amber-400 text-stone-900 font-extrabold text-sm px-4 py-2 hover:bg-amber-300 transition">Log in / Join</button>
            </div>
          )}

          <button className="lg:hidden p-2" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 px-4 pb-4 pt-2 flex flex-col gap-1 bg-campus-950">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-bold text-cream-100/90 hover:bg-white/10">{l.label}</NavLink>
          ))}
          {user && (user.role === 'seller' || user.role === 'admin') && <NavLink to="/sell" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-bold text-cream-100/90 hover:bg-white/10">Sell an item</NavLink>}
          {user && <NavLink to="/dashboard" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-bold text-cream-100/90 hover:bg-white/10">Dashboard</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-bold text-red-200 hover:bg-red-500/20">Admin</NavLink>}
          {user ? (
            <div className="flex items-center gap-2 pt-2">
              <CoinPill />
              <button onClick={() => { logout(); setOpen(false); nav('/'); }} className="text-sm font-bold text-red-300 px-3 py-2">Log out ({user.display_name})</button>
            </div>
          ) : (
            <button onClick={() => { setAuthOpen(true); setOpen(false); }} className="mt-2 rounded-xl bg-amber-400 text-stone-900 font-extrabold text-sm px-4 py-2.5">Log in / Join — get 500 coins</button>
          )}
        </div>
      )}
    </header>
  );
}
