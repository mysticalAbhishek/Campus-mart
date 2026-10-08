import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Heart, Eye, X, ShoppingCart, Gavel, SlidersHorizontal } from 'lucide-react';
import { api, CATEGORIES, CONDITIONS, type CMProduct } from '../lib/api';
import { useStore } from '../lib/store';
import { LockedPrice, PriceTag } from '../components/ui';

export default function Market() {
  const { user, toast, setAuthOpen, refreshUser } = useStore();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<CMProduct[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [selected, setSelected] = useState<CMProduct | null>(null);

  const [search, setSearch] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [condition, setCondition] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rows, wish] = await Promise.all([
        api.products({ search, category, condition, type, sort }),
        user ? api.wishlist(user.id) : Promise.resolve([]),
      ]);
      setProducts(rows.filter((p) => p.type === 'sell'));
      setWishlistIds(new Set((wish as any[]).map((w: any) => w.product_id)));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load marketplace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      setParams(search || category ? { ...(search ? { q: search } : {}), ...(category ? { category } : {}) } : {}, { replace: true });
      (async () => {
        try {
          const rows = await api.products({ search, category, condition, type, sort });
          setProducts(rows.filter((p) => p.type === 'sell'));
        } catch { /* ignore */ }
      })();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, condition, type, sort]);

  const toggleWish = async (p: CMProduct) => {
    if (!user) { setAuthOpen(true); toast('Login required to use the wishlist.', 'error'); return; }
    try {
      const r = await api.toggleWishlist(user.id, p.id);
      setWishlistIds((s) => {
        const n = new Set(s);
        if (r.wishlisted) n.add(p.id); else n.delete(p.id);
        return n;
      });
      toast(r.wishlisted ? 'Saved to wishlist ❤️' : 'Removed from wishlist.', r.wishlisted ? 'success' : 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Wishlist failed', 'error');
    }
  };

  const buy = async (p: CMProduct) => {
    if (!user) { setAuthOpen(true); toast('Login required to buy.', 'error'); return; }
    if (!confirm(`Buy "${p.title}" for ${p.price} Campus Coins?`)) return;
    setBuying(p.id);
    try {
      const r = await api.buy(user.id, p.id);
      toast(`Purchase complete! Order #${r.order.id}. New balance: ${r.buyer_balance} coins.`, 'success');
      setSelected(null);
      await fetchAll();
      await refreshUser();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Purchase failed', 'error');
    } finally {
      setBuying(null);
    }
  };

  const openDetail = (p: CMProduct) => {
    setSelected(p);
    api.viewProduct(p.id).catch(() => {});
  };

  const stats = useMemo(() => `${products.length} item${products.length === 1 ? '' : 's'}`, [products]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Marketplace · Sell Now</p>
          <h1 className="font-display font-black text-3xl md:text-4xl">Fixed-price finds</h1>
          <p className="text-sm text-stone-500 font-semibold mt-1">
            {user ? stats : `${stats} · 🔒 Log in to see prices, buy or wishlist`}
          </p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="sm:hidden inline-flex items-center gap-1.5 rounded-xl bg-white border border-stone-200 px-3 py-2 text-sm font-bold">
          <SlidersHorizontal size={15} /> Filters
        </button>
      </div>

      {/* SEARCH + FILTERS */}
      <div className={`mt-4 rounded-2xl bg-white border border-stone-200 p-4 ${showFilters ? '' : 'hidden sm:block'}`}>
        <div className="flex flex-col lg:flex-row gap-2">
          <label className="flex items-center gap-2 flex-1 bg-cream-50 border border-stone-200 rounded-xl px-3 py-2.5">
            <Search size={16} className="text-stone-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title (e.g. textbook, chair, headphones)…" className="flex-1 bg-transparent text-sm font-semibold" />
          </label>
          <div className="grid grid-cols-2 lg:flex gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-stone-200 bg-cream-50 px-3 py-2.5 text-sm font-bold">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="rounded-xl border border-stone-200 bg-cream-50 px-3 py-2.5 text-sm font-bold">
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-stone-200 bg-cream-50 px-3 py-2.5 text-sm font-bold">
              <option value="">Sell Now only</option>
              <option value="sell">Sell Now</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-stone-200 bg-cream-50 px-3 py-2.5 text-sm font-bold">
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="price_asc">Price: low → high {user ? '' : '(login)'}</option>
              <option value="price_desc">Price: high → low {user ? '' : '(login)'}</option>
            </select>
          </div>
        </div>
        {!user && <p className="text-[11px] font-bold text-stone-500 mt-2">🔒 Price-based sorting and prices unlock after login.</p>}
      </div>

      {/* GRID */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-2xl bg-white border border-stone-200 h-64 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white border border-stone-200 p-10 text-center">
          <p className="font-display font-black text-2xl">Nothing matches those filters</p>
          <p className="text-sm text-stone-500 font-semibold mt-1">Try clearing the search or picking another category.</p>
          <button onClick={() => { setSearch(''); setCategory(''); setCondition(''); setType(''); }} className="mt-4 rounded-xl bg-emerald-800 text-white text-sm font-extrabold px-4 py-2.5">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {products.map((p) => (
            <div key={p.id} className="card-lift rounded-2xl bg-white border border-stone-200 overflow-hidden flex flex-col">
              <button onClick={() => openDetail(p)} className="relative text-left">
                <img src={p.image_url} alt={p.title} className="h-40 w-full object-cover" loading="lazy" />
                <span className="absolute top-2 left-2 text-[10px] font-extrabold uppercase tracking-wide bg-campus-950/85 text-amber-300 rounded-full px-2 py-1">{p.category}</span>
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 rounded-full px-2 py-1 flex items-center gap-1"><Eye size={11} />{p.views}</span>
              </button>
              <div className="p-3 flex flex-col flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{p.condition}</p>
                <button onClick={() => openDetail(p)} className="font-extrabold text-sm leading-snug text-left line-clamp-2 hover:text-emerald-800">{p.title}</button>
                <div className="mt-2">{user ? <PriceTag value={p.price || 0} /> : <LockedPrice />}</div>
                <div className="flex gap-1.5 mt-3">
                  <button onClick={() => toggleWish(p)} title="Wishlist" className={`p-2 rounded-xl border transition ${wishlistIds.has(p.id) ? 'bg-red-50 border-red-200 text-red-600' : 'border-stone-200 text-stone-400 hover:text-red-500'}`}>
                    <Heart size={16} fill={wishlistIds.has(p.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={() => buy(p)} disabled={buying === p.id} className="flex-1 rounded-xl bg-emerald-800 text-white text-xs font-extrabold py-2 hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                    <ShoppingCart size={14} /> {buying === p.id ? 'Buying…' : 'Buy now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/70" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl bg-cream-50 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={selected.image_url} alt={selected.title} className="h-64 w-full object-cover" />
              <button onClick={() => setSelected(null)} className="absolute top-3 right-3 p-2 rounded-full bg-stone-950/70 text-white hover:bg-stone-950"><X size={16} /></button>
              <span className="absolute bottom-3 left-3 text-[11px] font-extrabold bg-campus-950/85 text-amber-300 rounded-full px-3 py-1.5">{selected.category} · {selected.condition}</span>
            </div>
            <div className="p-6">
              <h2 className="font-display font-black text-2xl leading-tight">{selected.title}</h2>
              <p className="text-sm text-stone-600 font-medium mt-2">{selected.description || 'No description provided.'}</p>
              <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                {user ? <PriceTag value={selected.price || 0} big /> : <LockedPrice label="Log in to see price & buy" />}
                <span className="text-xs font-bold text-stone-500 flex items-center gap-1"><Eye size={13} /> {selected.views} views</span>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => toggleWish(selected)} className="rounded-xl border-2 border-stone-200 px-4 py-2.5 text-sm font-extrabold inline-flex items-center gap-1.5 hover:border-red-300">
                  <Heart size={16} fill={wishlistIds.has(selected.id) ? '#dc2626' : 'none'} className={wishlistIds.has(selected.id) ? 'text-red-600' : ''} /> {wishlistIds.has(selected.id) ? 'Wishlisted' : 'Wishlist'}
                </button>
                <button onClick={() => buy(selected)} disabled={buying === selected.id} className="flex-1 rounded-xl bg-emerald-800 text-white font-extrabold py-2.5 hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-2">
                  {selected.type === 'auction' ? <Gavel size={16} /> : <ShoppingCart size={16} />} {buying === selected.id ? 'Processing…' : user ? `Buy for ${selected.price} coins` : 'Log in to buy'}
                </button>
              </div>
              {!user && <p className="text-xs font-bold text-stone-500 mt-3">🔒 Guests can browse but cannot see prices, buy, bid or wishlist. Balances & checkout are validated by the backend.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
