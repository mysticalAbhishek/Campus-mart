import { useState } from 'react';
import { X, Mail, Lock, User, Users, Gift, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

const DEMOS = [
  { email: 'buyer@campusmart.demo', label: 'Buyer demo' },
  { email: 'seller@campusmart.demo', label: 'Seller demo' },
  { email: 'admin@campusmart.demo', label: 'Admin demo' },
];

export default function AuthModal() {
  const { authOpen, setAuthOpen, login, toast } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('buyer');
  const [referral, setReferral] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!authOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const u = await api.login(email, password);
        login(u);
        toast(`Welcome back, ${u.display_name}! Balance: ${u.coins} coins.`, 'success');
      } else {
        const u = await api.signup({ email, password, role, display_name: displayName || email.split('@')[0], referral_code: referral });
        login(u);
        toast(`Account created! +500 Campus Coins. ${referral ? 'Referrer earned +50.' : ''}`, 'success');
      }
      setAuthOpen(false);
      setEmail(''); setPassword(''); setDisplayName(''); setReferral('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async (demoEmail: string) => {
    setErr('');
    setBusy(true);
    try {
      const u = await api.login(demoEmail, 'demo1234');
      login(u);
      toast(`Signed in as ${u.display_name} (${u.role}).`, 'success');
      setAuthOpen(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Demo login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm" onClick={() => setAuthOpen(false)}>
      <div className="w-full max-w-md bg-cream-50 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-campus-950 text-cream-50 px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="font-display font-black text-2xl">{mode === 'login' ? 'Welcome back' : 'Join Campus Mart'}</h2>
            <p className="text-sm text-cream-100/70 mt-1 flex items-center gap-1.5">
              <Gift size={14} className="text-amber-400" /> New accounts get <b className="text-amber-300">500 Campus Coins</b> — virtual only, no real money.
            </p>
          </div>
          <button onClick={() => setAuthOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10"><X size={18} /></button>
        </div>

        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 bg-stone-200/70 rounded-xl p-1 text-sm font-bold">
            <button onClick={() => { setMode('login'); setErr(''); }} className={`py-2 rounded-lg ${mode === 'login' ? 'bg-white shadow' : 'text-stone-500'}`}>Log in</button>
            <button onClick={() => { setMode('signup'); setErr(''); }} className={`py-2 rounded-lg ${mode === 'signup' ? 'bg-white shadow' : 'text-stone-500'}`}>Sign up</button>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-4 flex flex-col gap-3">
          {mode === 'signup' && (
            <label className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2.5">
              <User size={16} className="text-stone-400" />
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name (e.g. Alex Rivera)" className="flex-1 bg-transparent text-sm font-semibold" />
            </label>
          )}
          <label className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2.5">
            <Mail size={16} className="text-stone-400" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@campus.edu" className="flex-1 bg-transparent text-sm font-semibold" />
          </label>
          <label className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2.5">
            <Lock size={16} className="text-stone-400" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="flex-1 bg-transparent text-sm font-semibold" />
          </label>
          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(['buyer', 'seller'] as const).map((r) => (
                  <button type="button" key={r} onClick={() => setRole(r)} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold capitalize transition ${role === r ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-500'}`}>
                    {r === 'buyer' ? '🛒 Buyer' : '🧑‍💼 Seller'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2.5">
                <Users size={16} className="text-stone-400" />
                <input value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="Referral code (optional, +50 to inviter)" className="flex-1 bg-transparent text-sm font-semibold" />
              </label>
              <p className="text-[11px] text-stone-500 flex items-center gap-1"><ShieldAlert size={12} /> Admin accounts are seeded separately — no public admin signup.</p>
            </>
          )}
          {err && <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</p>}
          <button disabled={busy} className="rounded-xl bg-emerald-800 text-white font-extrabold py-3 hover:bg-emerald-700 disabled:opacity-60 transition">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account · get 500 coins'}
          </button>
        </form>

        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 text-[11px] font-bold text-stone-400 uppercase tracking-wider"><span className="flex-1 h-px bg-stone-200" /> Demo accounts <span className="flex-1 h-px bg-stone-200" /></div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {DEMOS.map((d) => (
              <button key={d.email} disabled={busy} onClick={() => demoLogin(d.email)} className="rounded-xl bg-stone-900 text-cream-50 text-xs font-bold px-2 py-2.5 hover:bg-stone-700 transition disabled:opacity-60">
                {d.label}<br /><span className="opacity-60 font-mono text-[10px]">demo1234</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
