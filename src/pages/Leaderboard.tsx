import { useEffect, useState } from 'react';
import { Trophy, Crown } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

export default function Leaderboard() {
  const { user, toast } = useStore();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRows(await api.leaderboard());
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to load leaderboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="rounded-3xl bg-campus-950 text-cream-50 p-8 text-center hero-grid-bg">
        <Trophy size={36} className="mx-auto text-amber-400" />
        <h1 className="font-display font-black text-3xl md:text-4xl mt-2">Leaderboard</h1>
        <p className="text-cream-100/70 font-medium mt-1 text-sm">Ranked by Campus Coin balance · earn via sales, rewards, tasks & referrals</p>
      </div>

      <div className="mt-5 rounded-3xl bg-white border border-stone-200 overflow-hidden">
        {loading ? (
          <p className="p-8 text-sm font-bold text-stone-500 text-center">Loading rankings…</p>
        ) : (
          rows.map((r, i) => {
            const me = user?.id === r.id;
            return (
              <div key={r.id} className={`flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-stone-100 last:border-0 ${me ? 'bg-amber-50' : ''} ${i < 3 ? 'sm:py-4' : ''}`}>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${i === 0 ? 'coin-shine text-white shadow' : i === 1 ? 'bg-stone-300 text-stone-700' : i === 2 ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-500'}`}>
                  {i + 1}
                </span>
                <span className="text-2xl">{r.avatar_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm flex items-center gap-1.5 truncate">
                    {i === 0 && <Crown size={14} className="text-amber-500 shrink-0" />}
                    {r.display_name}
                    {me && <span className="text-[10px] bg-emerald-700 text-white rounded-full px-2 py-0.5 font-bold">YOU</span>}
                  </p>
                  <p className="text-[11px] font-bold text-stone-400 uppercase">{r.role}</p>
                </div>
                <span className="font-black tick text-amber-700">◎ {r.coins}</span>
              </div>
            );
          })
        )}
      </div>
      <p className="text-center text-xs font-semibold text-stone-400 mt-3">Balances change live as students trade, win auctions and claim rewards.</p>
    </div>
  );
}
