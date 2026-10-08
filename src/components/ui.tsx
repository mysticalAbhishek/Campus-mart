import { useStore } from '../lib/store';
import { Coins, LogOut, LayoutDashboard, ShieldCheck, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function PriceTag({ value, big }: { value: number; big?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-extrabold text-amber-700 ${big ? 'text-2xl' : 'text-base'}`}>
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full coin-shine text-[11px] text-white shadow">C</span>
      {value} <span className="font-semibold text-amber-600/80 text-xs">coins</span>
    </span>
  );
}

export function LockedPrice({ label = 'Log in to see price' }: { label?: string }) {
  const { setAuthOpen } = useStore();
  return (
    <button
      onClick={() => setAuthOpen(true)}
      className="inline-flex items-center gap-2 rounded-full bg-stone-900/90 text-amber-300 px-3 py-1.5 text-xs font-bold hover:bg-stone-900 transition"
      title="Logged-out visitors cannot see prices"
    >
      <span className="price-blur font-extrabold text-sm select-none">◎ 999</span>
      🔒 {label}
    </button>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-start gap-2 rounded-xl px-4 py-3 shadow-2xl text-sm font-semibold text-white ${t.kind === 'success' ? 'bg-emerald-700' : t.kind === 'error' ? 'bg-red-700' : 'bg-stone-900'}`}>
          {t.kind === 'success' ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : t.kind === 'error' ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <Info size={18} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}

export function CoinPill() {
  const { user } = useStore();
  if (!user) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full coin-shine text-white font-extrabold text-sm px-3 py-1.5 shadow">
      <Coins size={15} /> <span className="tick">{user.coins}</span>
    </span>
  );
}

export function UserChip() {
  const { user, logout } = useStore();
  if (!user) return null;
  return (
    <span className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-stone-700 bg-white/70 rounded-full pl-1 pr-2 py-1 border border-stone-200">
      <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center">{user.avatar_emoji}</span>
      {user.display_name}
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase ${user.role === 'admin' ? 'bg-red-100 text-red-700' : user.role === 'seller' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{user.role}</span>
      <button onClick={logout} title="Log out" className="hover:text-red-600"><LogOut size={14} /></button>
    </span>
  );
}

export function AdminBadge() {
  const { user } = useStore();
  if (user?.role !== 'admin') return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-700 text-white rounded-full px-2 py-1">
      <ShieldCheck size={12} /> ADMIN SEEDED
    </span>
  );
}

export function DashIcon() {
  return <LayoutDashboard size={16} />;
}
