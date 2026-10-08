import { useEffect, useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { api, type CMVirtualItem, type CMInventoryRow } from '../lib/api';
import { useStore } from '../lib/store';

const rarityStyle: Record<string, string> = {
  common: 'bg-stone-100 text-stone-600',
  rare: 'bg-sky-100 text-sky-700',
  epic: 'bg-purple-100 text-purple-700',
  legendary: 'bg-amber-100 text-amber-700',
};

export default function Shop() {
  const { user, toast, setAuthOpen, refreshUser } = useStore();
  const [items, setItems] = useState<CMVirtualItem[]>([]);
  const [owned, setOwned] = useState<Set<number>>(new Set());
  const [inventory, setInventory] = useState<CMInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const list = await api.shop();
      setItems(list);
      if (user) {
        const inv = await api.inventory(user.id);
        setInventory(inv);
        setOwned(new Set(inv.map((r) => r.item_id)));
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load shop', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const buy = async (item: CMVirtualItem) => {
    if (!user) { setAuthOpen(true); toast('Login required to shop.', 'error'); return; }
    if (!confirm(`Buy "${item.name}" for ${item.price} coins? It will be added to your inventory.`)) return;
    setBuying(item.id);
    try {
      const r = await api.buyItem(user.id, item.id);
      toast(`Purchased ${item.name}! New balance: ${r.balance} coins.`, 'success');
      await refreshUser();
      await fetchAll();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Purchase failed', 'error');
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Virtual shop · badges & perks</p>
      <h1 className="font-display font-black text-3xl md:text-4xl flex items-center gap-2"><ShoppingBag className="text-emerald-700" /> Campus shop</h1>
      <p className="text-sm text-stone-500 font-semibold mt-1">{user ? `Balance: ◎ ${user.coins} · purchases land in your inventory` : '🔒 Log in to buy badges with coins.'}</p>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-56 rounded-2xl bg-white border animate-pulse" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {items.map((it) => {
            const has = owned.has(it.id);
            return (
              <div key={it.id} className="card-lift rounded-2xl bg-white border border-stone-200 p-5 flex flex-col text-center">
                <div className="text-5xl">{it.emoji}</div>
                <p className="font-extrabold mt-2">{it.name}</p>
                <span className={`mx-auto mt-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-full px-2 py-0.5 ${rarityStyle[it.rarity] || rarityStyle.common}`}>{it.rarity}</span>
                <p className="text-xs text-stone-500 font-semibold mt-2 flex-1">{it.description}</p>
                <p className="text-[11px] font-bold text-emerald-700 mt-1">✨ {it.perk}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="font-black tick text-amber-700">◎ {it.price}</span>
                </div>
                <button onClick={() => buy(it)} disabled={has || buying === it.id} className={`mt-2.5 rounded-xl text-sm font-extrabold py-2.5 inline-flex items-center justify-center gap-1.5 ${has ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-900 text-white hover:bg-stone-700'} disabled:opacity-70`}>
                  {has ? <><Check size={15} /> Owned</> : buying === it.id ? 'Buying…' : 'Buy with coins'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {user && inventory.length > 0 && (
        <div className="mt-8 rounded-3xl bg-campus-950 text-cream-50 p-6">
          <h2 className="font-display font-black text-xl">🎒 Your inventory ({inventory.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
            {inventory.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white/10 border border-white/15 p-3 text-center">
                <div className="text-3xl">{r.item?.emoji}</div>
                <p className="text-sm font-extrabold mt-1">{r.item?.name}</p>
                <p className="text-[11px] text-cream-100/60 font-semibold">{r.item?.perk}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
