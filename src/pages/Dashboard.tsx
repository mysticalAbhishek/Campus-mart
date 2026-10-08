import { useEffect, useState } from 'react';
import { LayoutDashboard, Heart, Gavel, Package, ArrowLeftRight, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, timeLeft } from '../lib/api';
import { useStore } from '../lib/store';
import { PriceTag } from '../components/ui';

type Tab = 'overview' | 'purchases' | 'bids' | 'wishlist' | 'transactions' | 'sales' | 'inventory';

export default function Dashboard() {
  const { user, toast, setAuthOpen } = useStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [dash, setDash] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const [d, p, s, b, w, inv] = await Promise.all([
          api.dashboard(user.id),
          api.orders(user.id, 'buyer'),
          api.orders(user.id, 'seller'),
          api.bids({ bidder_id: String(user.id) }),
          api.wishlist(user.id),
          api.inventory(user.id),
        ]);
        setDash(d);
        setPurchases(p);
        setSales(s);
        setBids(b);
        setWishlist(w);
        setInventory(inv);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to load dashboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <div className="rounded-3xl bg-campus-950 text-cream-50 p-10">
          <LayoutDashboard size={36} className="mx-auto text-amber-400" />
          <h1 className="font-display font-black text-3xl mt-2">Your dashboard awaits</h1>
          <p className="text-cream-100/70 font-medium text-sm mt-1">Profile, purchases, bids, transactions, shop & inventory — all in one place.</p>
          <button onClick={() => setAuthOpen(true)} className="mt-4 rounded-xl bg-amber-400 text-stone-900 font-extrabold px-6 py-3">Log in / Join</button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'purchases', label: `Purchases (${purchases.length})`, icon: Package },
    { id: 'bids', label: `My bids (${bids.length})`, icon: Gavel },
    { id: 'wishlist', label: `Wishlist (${wishlist.length})`, icon: Heart },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    ...(user.role !== 'buyer' ? [{ id: 'sales' as Tab, label: `Sales (${sales.length})`, icon: Package }] : []),
    { id: 'inventory', label: `Inventory (${inventory.length})`, icon: ShoppingBag },
  ];

  const removeWish = async (product_id: number) => {
    try {
      await fetch(`/api/wishlist?user_id=${user.id}&product_id=${product_id}`, { method: 'DELETE' });
      setWishlist((w) => w.filter((x: any) => x.product_id !== product_id));
      toast('Removed from wishlist.', 'info');
    } catch { toast('Failed to remove.', 'error'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* PROFILE HEADER */}
      <div className="rounded-3xl bg-campus-950 text-cream-50 p-6 md:p-8 hero-grid-bg flex flex-col md:flex-row gap-5 md:items-center">
        <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/15 flex items-center justify-center text-5xl shrink-0">{user.avatar_emoji}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-black text-2xl md:text-3xl">{user.display_name}</h1>
            <span className={`text-[11px] font-extrabold uppercase rounded-full px-2.5 py-1 ${user.role === 'admin' ? 'bg-red-500' : user.role === 'seller' ? 'bg-sky-500' : 'bg-emerald-600'}`}>{user.role}</span>
          </div>
          <p className="text-sm text-cream-100/70 font-medium">{user.bio} · {user.email}</p>
          <p className="text-xs font-bold text-cream-100/50 mt-1">Referral code <span className="font-mono text-amber-300">{user.referral_code}</span> — share it, earn +50 per signup</p>
        </div>
        <div className="rounded-2xl coin-shine text-white px-6 py-4 text-center shadow-xl">
          <p className="text-[11px] font-extrabold uppercase opacity-80">Balance</p>
          <p className="font-display font-black text-4xl tick">{loading ? '…' : dash?.profile?.coins ?? user.coins}</p>
          <Link to="/coins" className="text-[11px] font-extrabold underline">Manage coins →</Link>
        </div>
      </div>

      {/* TABS */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-extrabold transition ${tab === t.id ? 'bg-emerald-800 text-white shadow' : 'bg-white border border-stone-200 text-stone-600 hover:border-emerald-400'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'overview' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Purchases', dash?.stats?.purchases ?? 0, `◎ ${dash?.stats?.spent ?? 0} spent`],
              ['Sales', dash?.stats?.sales ?? 0, `◎ ${dash?.stats?.earned ?? 0} earned`],
              ['Bids placed', dash?.stats?.bids ?? 0, `${dash?.stats?.winningBids ?? 0} currently winning`],
              ['Wishlist', dash?.stats?.wishlist ?? 0, `${dash?.stats?.inventory ?? 0} shop items owned`],
            ].map(([t, v, s]) => (
              <div key={t as string} className="rounded-2xl bg-white border border-stone-200 p-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">{t}</p>
                <p className="font-display font-black text-4xl tick">{v}</p>
                <p className="text-xs font-bold text-stone-500">{s}</p>
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-4 rounded-2xl bg-white border border-stone-200 p-5">
              <p className="font-extrabold">Recent activity</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {(dash?.recentTransactions || []).map((h: any) => (
                  <div key={h.id} className="flex items-center gap-2 text-sm bg-cream-50 border border-stone-100 rounded-xl px-3 py-2">
                    <span className={`text-xs font-black rounded-full px-2 py-0.5 ${h.amount >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{h.amount >= 0 ? `+${h.amount}` : h.amount}</span>
                    <span className="font-bold flex-1 truncate">{h.description}</span>
                  </div>
                ))}
                {(dash?.recentTransactions || []).length === 0 && <p className="text-sm text-stone-500 font-semibold">No activity yet — go browse the marketplace!</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'purchases' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {purchases.map((o) => (
              <div key={o.id} className="rounded-2xl bg-white border p-4 flex gap-3">
                <img src={o.product?.image_url || 'https://picsum.photos/seed/cm-fallback/200/200'} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="font-extrabold text-sm leading-snug truncate">{o.product?.title || `Product #${o.product_id}`}</p>
                  <p className="mt-1"><PriceTag value={o.amount} /></p>
                  <p className="text-[11px] font-semibold text-stone-400">Order #{o.id} · {o.created_at ? new Date(o.created_at).toLocaleDateString() : ''} {o.auction_id ? '· via auction 🏆' : ''}</p>
                </div>
              </div>
            ))}
            {purchases.length === 0 && <Empty msg="No purchases yet — your orders will appear here." />}
          </div>
        )}

        {tab === 'sales' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sales.map((o) => (
              <div key={o.id} className="rounded-2xl bg-white border p-4 flex gap-3">
                <img src={o.product?.image_url || 'https://picsum.photos/seed/cm-fallback/200/200'} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                <div>
                  <p className="font-extrabold text-sm">{o.product?.title || `Product #${o.product_id}`}</p>
                  <p className="mt-1 font-black text-emerald-700 tick">+◎ {o.amount}</p>
                  <p className="text-[11px] font-semibold text-stone-400">Order #{o.id} {o.auction_id ? '· auction win 🏆' : ''}</p>
                </div>
              </div>
            ))}
            {sales.length === 0 && <Empty msg="No sales yet — list something from the Sell page!" />}
          </div>
        )}

        {tab === 'bids' && (
          <div className="flex flex-col gap-2">
            {bids.map((b) => (
              <div key={b.id} className="rounded-2xl bg-white border px-4 py-3 flex items-center gap-3 flex-wrap">
                <Gavel size={16} className="text-amber-600" />
                <div className="flex-1 min-w-[180px]">
                  <p className="font-extrabold text-sm">{b.auction?.title || `Auction #${b.auction_id}`}</p>
                  <p className="text-[11px] font-semibold text-stone-400">{b.auction?.status} · ends {b.auction ? timeLeft(b.auction.end_time) : ''}</p>
                </div>
                <span className="font-black tick">◎ {b.amount}</span>
                <Link to="/auctions" className="text-xs font-extrabold text-emerald-700 hover:underline">Open auction →</Link>
              </div>
            ))}
            {bids.length === 0 && <Empty msg="No bids yet — head to Auctions and place your first bid!" />}
          </div>
        )}

        {tab === 'wishlist' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {wishlist.map((w: any) => (
              <div key={w.id} className="rounded-2xl bg-white border overflow-hidden">
                <img src={w.product?.image_url} alt={w.product?.title} className="h-36 w-full object-cover" />
                <div className="p-3">
                  <p className="font-extrabold text-sm line-clamp-2">{w.product?.title}</p>
                  <div className="mt-1"><PriceTag value={w.product?.type === 'auction' ? w.product?.starting_price : w.product?.price} /></div>
                  <button onClick={() => removeWish(w.product_id)} className="mt-2 text-xs font-extrabold text-red-600 inline-flex items-center gap-1 hover:underline"><Trash2 size={12} /> Remove</button>
                </div>
              </div>
            ))}
            {wishlist.length === 0 && <Empty msg="Wishlist is empty — tap the heart on any listing!" />}
          </div>
        )}

        {tab === 'transactions' && (
          <div className="rounded-2xl bg-white border p-5">
            <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto">
              {(dash?.recentTransactions || []).map((h: any) => (
                <div key={h.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-cream-50 px-3 py-2.5">
                  <span className={`text-xs font-black rounded-full px-2 py-1 ${h.amount >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{h.amount >= 0 ? `+${h.amount}` : h.amount}</span>
                  <div className="flex-1"><p className="text-sm font-bold">{h.description}</p><p className="text-[11px] text-stone-400 font-semibold">{h.type} · bal {h.balance_after}</p></div>
                </div>
              ))}
              <Link to="/coins" className="text-sm font-extrabold text-emerald-700 hover:underline text-center pt-2">Full ledger + transfers on the Coins page →</Link>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {inventory.map((r: any) => (
              <div key={r.id} className="rounded-2xl bg-white border p-4 text-center">
                <div className="text-4xl">{r.item?.emoji}</div>
                <p className="font-extrabold text-sm mt-1">{r.item?.name}</p>
                <p className="text-[11px] text-stone-500 font-semibold">{r.item?.perk}</p>
              </div>
            ))}
            {inventory.length === 0 && <Empty msg="No shop items yet — visit the Shop to spend coins on badges!" />}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="col-span-full rounded-2xl bg-white border border-dashed border-stone-300 p-8 text-center text-sm font-bold text-stone-500">{msg}</div>;
}
