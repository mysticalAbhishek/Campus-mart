import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Store, Gavel, Package, ArrowLeftRight } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';

export default function Admin() {
  const { user, toast, setAuthOpen } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'products' | 'auctions' | 'orders' | 'transactions'>('users');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        setData(await api.admin(user.id));
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Admin load failed', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <div className="rounded-3xl bg-white border p-10">
          <ShieldCheck size={36} className="mx-auto text-red-700" />
          <h1 className="font-display font-black text-3xl mt-2">Admin only</h1>
          <p className="text-sm text-stone-500 font-semibold">Log in with the seeded admin account. There is no public admin signup.</p>
          <button onClick={() => setAuthOpen(true)} className="mt-4 rounded-xl bg-stone-900 text-white font-extrabold px-6 py-3">Log in</button>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <div className="rounded-3xl bg-red-50 border border-red-200 p-10">
          <ShieldCheck size={36} className="mx-auto text-red-700" />
          <h1 className="font-display font-black text-3xl mt-2">403 — Admin access required</h1>
          <p className="text-sm text-red-800/70 font-semibold mt-1">Signed in as {user.display_name} ({user.role}). The backend rejects non-admin requests too.</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="rounded-3xl bg-red-950 text-white p-6 md:p-8 flex flex-wrap items-center gap-4">
        <ShieldCheck size={36} className="text-red-300" />
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-display font-black text-2xl md:text-3xl">Admin dashboard</h1>
          <p className="text-sm text-red-200/80 font-medium">Seeded admin · full visibility over users, products, auctions, orders & ledger</p>
        </div>
        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full mt-2">
            {[
              ['Users', stats.totalUsers], ['Products', stats.totalProducts], ['Live auctions', stats.activeAuctions],
              ['Orders', stats.totalOrders], ['Coins in circulation', stats.coinsInCirculation], ['Trade volume', stats.volume],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-2xl bg-white/10 border border-white/15 p-3 text-center">
                <p className="font-black text-xl tick">{v}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-200/70">{k}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {([
          ['users', 'Users', Users], ['products', 'Products', Store], ['auctions', 'Auctions', Gavel],
          ['orders', 'Orders', Package], ['transactions', 'Ledger', ArrowLeftRight],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-extrabold ${tab === id ? 'bg-red-800 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>
            <Icon size={15} /> {label} ({data?.[id]?.length ?? '…'})
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-white border border-stone-200 overflow-hidden">
        {loading ? (
          <p className="p-8 text-sm font-bold text-stone-500 text-center">Loading admin data…</p>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'users' && (
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b">{['User', 'Email', 'Role', 'Coins', 'Referral'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {data.users.map((u: any) => (
                    <tr key={u.id} className="border-b last:border-0 border-stone-100">
                      <td className="px-4 py-2.5 font-extrabold">{u.avatar_emoji} {u.display_name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-extrabold uppercase rounded-full px-2 py-0.5 ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'seller' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.role}</span></td>
                      <td className="px-4 py-2.5 font-black tick">◎ {u.coins}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{u.referral_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'products' && (
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b">{['Title', 'Type', 'Price', 'Status', 'Seller'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {data.products.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 border-stone-100">
                      <td className="px-4 py-2.5 font-bold">{p.title}</td>
                      <td className="px-4 py-2.5 text-xs font-bold">{p.type}</td>
                      <td className="px-4 py-2.5 font-black tick">◎ {p.type === 'auction' ? p.starting_price : p.price}</td>
                      <td className="px-4 py-2.5 text-xs font-bold">{p.status}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">#{p.seller_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'auctions' && (
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b">{['Auction', 'Current bid', 'Status', 'Ends'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {data.auctions.map((a: any) => (
                    <tr key={a.id} className="border-b last:border-0 border-stone-100">
                      <td className="px-4 py-2.5 font-bold">{a.title}</td>
                      <td className="px-4 py-2.5 font-black tick">◎ {a.current_bid}</td>
                      <td className="px-4 py-2.5 text-xs font-bold">{a.status}</td>
                      <td className="px-4 py-2.5 text-xs">{new Date(a.end_time).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'orders' && (
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b">{['Order', 'Buyer → Seller', 'Amount', 'Via'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {data.orders.map((o: any) => (
                    <tr key={o.id} className="border-b last:border-0 border-stone-100">
                      <td className="px-4 py-2.5 font-bold">#{o.id} · product #{o.product_id}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">#{o.buyer_id} → #{o.seller_id}</td>
                      <td className="px-4 py-2.5 font-black tick">◎ {o.amount}</td>
                      <td className="px-4 py-2.5 text-xs font-bold">{o.auction_id ? `auction #${o.auction_id}` : 'buy now'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'transactions' && (
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b">{['User', 'Type', 'Amount', 'Balance after', 'Description'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {data.transactions.map((t: any) => (
                    <tr key={t.id} className="border-b last:border-0 border-stone-100">
                      <td className="px-4 py-2.5 font-mono text-xs">#{t.user_id}</td>
                      <td className="px-4 py-2.5 text-xs font-bold">{t.type}</td>
                      <td className={`px-4 py-2.5 font-black tick ${t.amount >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{t.amount >= 0 ? `+${t.amount}` : t.amount}</td>
                      <td className="px-4 py-2.5 tick">{t.balance_after}</td>
                      <td className="px-4 py-2.5 text-xs max-w-[280px] truncate">{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
