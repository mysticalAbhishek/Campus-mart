import { useEffect, useState } from 'react';
import { Coins, Gift, ArrowLeftRight, CheckCircle2, ListChecks } from 'lucide-react';
import { api, type CMTransaction } from '../lib/api';
import { useStore } from '../lib/store';

export default function CoinsPage() {
  const { user, toast, setAuthOpen, refreshUser } = useStore();
  const [balance, setBalance] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [history, setHistory] = useState<CMTransaction[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toEmail, setToEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState('');

  const fetchAll = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.coins(user.id);
      setBalance(r.balance);
      setClaimedToday(r.claimedToday);
      setHistory(r.history);
      setTasks(r.tasks);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load coins', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const claimDaily = async () => {
    if (!user) { setAuthOpen(true); return; }
    setBusy('daily');
    try {
      const r = await api.dailyReward(user.id);
      setBalance(r.balance);
      setClaimedToday(true);
      toast(`+${r.amount} coins claimed! Come back tomorrow.`, 'success');
      await refreshUser();
      await fetchAll();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Claim failed', 'error');
    } finally {
      setBusy('');
    }
  };

  const transfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setAuthOpen(true); return; }
    setBusy('transfer');
    try {
      const r = await api.transfer(user.id, toEmail, parseInt(amount));
      setBalance(r.balance);
      toast(`Transferred ${amount} coins to ${toEmail}. Ledgered for both sides.`, 'success');
      setToEmail(''); setAmount('');
      await refreshUser();
      await fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Transfer failed', 'error');
    } finally {
      setBusy('');
    }
  };

  const claimTask = async (id: string) => {
    if (!user) return;
    setBusy(id);
    try {
      const r = await api.claimTask(user.id, id);
      setBalance(r.balance);
      toast(`Task complete! +${r.amount} coins.`, 'success');
      await refreshUser();
      await fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Task claim failed', 'error');
    } finally {
      setBusy('');
    }
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <div className="rounded-3xl bg-campus-950 text-cream-50 p-10">
          <Coins size={40} className="mx-auto text-amber-400" />
          <h1 className="font-display font-black text-3xl mt-3">Campus Coins live here</h1>
          <p className="text-cream-100/70 font-medium mt-2">Log in to claim your daily +25, complete tasks, transfer coins and see your ledger. Virtual currency only — no real money.</p>
          <button onClick={() => setAuthOpen(true)} className="mt-5 rounded-xl bg-amber-400 text-stone-900 font-extrabold px-6 py-3 hover:bg-amber-300">Log in / Join · +500 coins</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="rounded-3xl bg-campus-950 text-cream-50 p-6 hero-grid-bg">
          <p className="text-xs font-bold uppercase tracking-widest text-cream-100/60">Your balance</p>
          <p className="font-display font-black text-5xl tick mt-1">{loading ? '…' : balance} <span className="text-lg text-amber-300">coins</span></p>
          <p className="text-xs font-bold text-cream-100/60 mt-1">{user.display_name} · referral code <span className="text-amber-300 font-mono">{user.referral_code}</span></p>
          <button onClick={claimDaily} disabled={claimedToday || busy === 'daily'} className={`mt-4 w-full rounded-xl font-extrabold py-3 text-sm inline-flex items-center justify-center gap-2 transition ${claimedToday ? 'bg-white/10 text-cream-100/50' : 'bg-amber-400 text-stone-900 hover:bg-amber-300'}`}>
            <Gift size={16} /> {claimedToday ? 'Claimed today ✓ — back tomorrow!' : busy === 'daily' ? 'Claiming…' : 'Claim daily +25'}
          </button>
          <p className="text-[11px] font-semibold text-cream-100/50 mt-2">Enforced server-side: one claim per UTC day.</p>
        </div>

        <form onSubmit={transfer} className="rounded-3xl bg-white border border-stone-200 p-6">
          <h2 className="font-extrabold flex items-center gap-2"><ArrowLeftRight size={17} className="text-emerald-700" /> Transfer coins</h2>
          <p className="text-xs text-stone-500 font-semibold mt-1">Positive amount · sufficient balance · never to yourself. Both sides get ledger entries.</p>
          <input value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="Recipient email (e.g. maya@campus.edu)" className="mt-3 w-full rounded-xl border border-stone-200 bg-cream-50 px-3 py-2.5 text-sm font-semibold" />
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="mt-2 w-full rounded-xl border border-stone-200 bg-cream-50 px-3 py-2.5 text-sm font-bold tick" />
          <button disabled={busy === 'transfer'} className="mt-3 w-full rounded-xl bg-emerald-800 text-white text-sm font-extrabold py-2.5 disabled:opacity-60">{busy === 'transfer' ? 'Sending…' : 'Send coins'}</button>
          <div className="mt-3 text-[11px] font-bold text-stone-500 bg-cream-50 rounded-xl p-2.5">Try: maya@campus.edu · jordan@campus.edu · seller@campusmart.demo</div>
        </form>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-5">
        <div className="rounded-3xl bg-white border border-stone-200 p-6">
          <h2 className="font-extrabold flex items-center gap-2"><ListChecks size={17} className="text-emerald-700" /> Earn via tasks</h2>
          <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-2xl border border-stone-200 bg-cream-50 p-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-sm">{t.label}</p>
                  <span className="text-xs font-black text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">+{t.reward}</span>
                </div>
                <p className="text-xs text-stone-500 font-semibold mt-1 flex-1">{t.desc}</p>
                <button onClick={() => claimTask(t.id)} disabled={t.claimed || busy === t.id} className={`mt-2.5 rounded-xl text-xs font-extrabold py-2 inline-flex items-center justify-center gap-1.5 ${t.claimed ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-900 text-white hover:bg-stone-700'}`}>
                  {t.claimed ? <><CheckCircle2 size={13} /> Claimed</> : busy === t.id ? 'Checking…' : 'Claim reward'}
                </button>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-stone-500 font-semibold">{loading ? 'Loading…' : 'No tasks.'}</p>}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-stone-200 p-6">
          <h2 className="font-extrabold">Transaction ledger <span className="text-xs font-bold text-stone-400">· every coin movement is recorded</span></h2>
          <div className="mt-3 flex flex-col gap-1.5 max-h-[420px] overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-cream-50 px-3 py-2.5">
                <span className={`text-xs font-black rounded-full px-2 py-1 ${h.amount >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{h.amount >= 0 ? `+${h.amount}` : h.amount}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{h.description}</p>
                  <p className="text-[11px] font-semibold text-stone-400">{h.type} · bal after {h.balance_after} · {h.created_at ? new Date(h.created_at).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-sm text-stone-500 font-semibold">{loading ? 'Loading…' : 'No transactions yet.'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
