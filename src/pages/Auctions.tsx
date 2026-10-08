import { useEffect, useRef, useState } from 'react';
import { Gavel, Plus, Timer, X, Trophy, ImagePlus, LayoutGrid, Link2, FolderOpen } from 'lucide-react';
import { api, timeLeft, type CMAuction, type CMBid } from '../lib/api';
import { useStore } from '../lib/store';

const GALLERY_IMAGES = [
  'https://picsum.photos/seed/cm-g-textbook/640/420',
  'https://picsum.photos/seed/cm-g-laptop/640/420',
  'https://picsum.photos/seed/cm-g-headphones/640/420',
  'https://picsum.photos/seed/cm-g-chair/640/420',
  'https://picsum.photos/seed/cm-g-desk/640/420',
  'https://picsum.photos/seed/cm-g-bike/640/420',
  'https://picsum.photos/seed/cm-g-sneakers/640/420',
  'https://picsum.photos/seed/cm-g-guitar/640/420',
  'https://picsum.photos/seed/cm-g-camera/640/420',
  'https://picsum.photos/seed/cm-g-fridge/640/420',
  'https://picsum.photos/seed/cm-g-lamp/640/420',
  'https://picsum.photos/seed/cm-g-hoodie/640/420',
];

function fileToResizedDataUrl(file: File, maxDim = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Image processing not supported.')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function Auctions() {
  const { user, toast, setAuthOpen, refreshUser } = useStore();
  const [auctions, setAuctions] = useState<CMAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [selected, setSelected] = useState<CMAuction | null>(null);
  const [bids, setBids] = useState<CMBid[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Electronics', starting_price: '', duration_hours: '48', image_url: '' });
  const [creating, setCreating] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'gallery' | 'url'>('gallery');
  const [readingFile, setReadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const rows = await api.auctions(filter === 'active' ? 'active' : '');
      const sorted = [...rows].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
      });
      setAuctions(sorted);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load auctions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openAuction = async (a: CMAuction) => {
    setSelected(a);
    setBidAmount(String((a.current_bid || 0) + 5));
    try {
      const b = await api.bids({ auction_id: String(a.id) });
      setBids(b);
    } catch { setBids([]); }
  };

  const placeBid = async () => {
    if (!user) { setAuthOpen(true); toast('Login required to bid.', 'error'); return; }
    if (!selected) return;
    const amt = parseInt(bidAmount);
    if (!amt || amt <= 0) { toast('Enter a positive bid amount.', 'error'); return; }
    setBidding(true);
    try {
      await api.placeBid(selected.id, user.id, amt);
      toast(`Bid of ${amt} coins placed! Funds are only charged if you win.`, 'success');
      const [rows, b] = await Promise.all([api.auctions(filter === 'active' ? 'active' : ''), api.bids({ auction_id: String(selected.id) })]);
      setAuctions(rows);
      setBids(b);
      const upd = rows.find((r) => r.id === selected.id);
      if (upd) { setSelected(upd); setBidAmount(String(upd.current_bid + 5)); }
      await refreshUser();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Bid failed', 'error');
    } finally {
      setBidding(false);
    }
  };

  const endAndSettle = async (a: CMAuction, auto = false) => {
    if (!user) return;
    try {
      if (a.status === 'active') {
        await api.endAuction(a.id, user.id);
        toast('Auction ended. Settling winner…', 'info');
      }
      const r = await api.settleAuction(a.id);
      if (r.winner) toast(`🏆 ${r.winner.display_name} won "${a.title}" for ${r.amount} coins. Coins moved securely.`, 'success');
      else toast(r.message || 'Auction settled with no winner.', 'info');
      await fetchAll();
      setSelected(null);
      await refreshUser();
    } catch (e) {
      if (!auto) toast(e instanceof Error ? e.message : 'Settle failed', 'error');
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setAuthOpen(true); return; }
    setCreating(true);
    try {
      await api.createAuction({
        seller_id: user.id,
        title: form.title,
        description: form.description,
        category: form.category,
        starting_price: parseInt(form.starting_price),
        duration_hours: parseInt(form.duration_hours),
        image_url: form.image_url || undefined,
      });
      toast('Auction created! Bidders can now place validated bids.', 'success');
      setShowCreate(false);
      setForm({ title: '', description: '', category: 'Electronics', starting_price: '', duration_hours: '48', image_url: '' });
      setImageTab('gallery');
      await fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Create failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Please choose an image file (JPG/PNG/WebP).', 'error'); return; }
    if (file.size > 8 * 1024 * 1024) { toast('Image is too large — please pick a file under 8MB.', 'error'); return; }
    setReadingFile(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm((f) => ({ ...f, image_url: dataUrl }));
      toast('Photo attached — visible to all users once published.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not read image.', 'error');
    } finally {
      setReadingFile(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const canSell = user && (user.role === 'seller' || user.role === 'admin');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Auctions · only winners pay</p>
          <h1 className="font-display font-black text-3xl md:text-4xl flex items-center gap-2"><Gavel className="text-emerald-700" /> Live auctions</h1>
          <p className="text-sm text-stone-500 font-semibold mt-1">{user ? 'Bids are validated: active, higher than current, and within your balance.' : '🔒 Log in to see bids and place offers.'}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border border-stone-200 rounded-xl p-1 text-sm font-bold">
            <button onClick={() => setFilter('active')} className={`px-3 py-1.5 rounded-lg ${filter === 'active' ? 'bg-emerald-800 text-white' : 'text-stone-500'}`}>Live</button>
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg ${filter === 'all' ? 'bg-emerald-800 text-white' : 'text-stone-500'}`}>All + settled</button>
          </div>
          {canSell && (
            <button onClick={() => setShowCreate(true)} className="rounded-xl bg-amber-400 text-stone-900 text-sm font-extrabold px-4 py-2 inline-flex items-center gap-1.5 hover:bg-amber-300">
              <Plus size={15} /> New auction
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 rounded-2xl bg-white border border-stone-200 animate-pulse" />)}
        </div>
      ) : auctions.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white border p-10 text-center">
          <p className="font-display font-black text-2xl">No auctions here yet</p>
          <p className="text-sm text-stone-500 font-semibold">Sellers can launch one — winners pay automatically at settlement.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {auctions.map((a) => {
            const live = a.status === 'active' && new Date(a.end_time) > new Date();
            return (
              <div key={a.id} className="card-lift rounded-2xl bg-white border border-stone-200 overflow-hidden flex flex-col">
                <button onClick={() => openAuction(a)} className="relative text-left">
                  <img src={a.image_url} alt={a.title} className="h-44 w-full object-cover" loading="lazy" />
                  <span className={`absolute top-2 left-2 text-[10px] font-extrabold uppercase rounded-full px-2.5 py-1 ${live ? 'bg-emerald-600 text-white' : a.status === 'settled' ? 'bg-stone-700 text-white' : 'bg-amber-500 text-stone-900'}`}>
                    {live ? '● LIVE' : a.status.toUpperCase()}
                  </span>
                  <span className="absolute bottom-2 right-2 text-[11px] font-bold bg-stone-950/80 text-white rounded-full px-2.5 py-1 inline-flex items-center gap-1"><Timer size={11} /> {timeLeft(a.end_time)}</span>
                </button>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="font-extrabold leading-snug">{a.title}</p>
                  <p className="text-xs text-stone-500 font-semibold mt-0.5">{a.category} · starts at {user ? `◎ ${a.starting_price}` : '🔒'}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-stone-400">Current bid</p>
                      {user ? <p className="font-black text-xl tick text-emerald-800">◎ {a.current_bid}</p> : <p className="text-xs font-bold text-stone-500">🔒 Log in to see bids</p>}
                    </div>
                    <span className="text-xs font-bold text-stone-500">{a.bids_count || 0} bids</span>
                  </div>
                  <button onClick={() => openAuction(a)} className="mt-3 rounded-xl bg-campus-950 text-cream-50 text-sm font-extrabold py-2.5 hover:bg-campus-800">
                    {user ? 'View & bid' : 'Preview (login to bid)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BID MODAL */}
      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/70" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl bg-cream-50 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={selected.image_url} alt={selected.title} className="h-56 w-full object-cover" />
              <button onClick={() => setSelected(null)} className="absolute top-3 right-3 p-2 rounded-full bg-stone-950/70 text-white"><X size={16} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <h2 className="font-display font-black text-2xl">{selected.title}</h2>
                <span className="text-xs font-bold bg-stone-900 text-amber-300 rounded-full px-3 py-1.5 inline-flex items-center gap-1"><Timer size={12} />{timeLeft(selected.end_time)}</span>
              </div>
              <p className="text-sm text-stone-600 font-medium mt-2">{selected.description}</p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="rounded-xl bg-white border p-3"><p className="text-[10px] font-extrabold uppercase text-stone-400">Starting</p><p className="font-black tick">{user ? `◎ ${selected.starting_price}` : '🔒'}</p></div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><p className="text-[10px] font-extrabold uppercase text-emerald-600">Current bid</p><p className="font-black tick text-emerald-800 text-lg">{user ? `◎ ${selected.current_bid}` : '🔒'}</p></div>
                <div className="rounded-xl bg-white border p-3"><p className="text-[10px] font-extrabold uppercase text-stone-400">Bids</p><p className="font-black">{bids.length}</p></div>
              </div>

              {selected.status === 'active' ? (
                <div className="mt-4 rounded-2xl bg-white border p-4">
                  <p className="text-sm font-extrabold">Place a bid {user ? `(min ◎ ${(selected.current_bid || 0) + 1})` : ''}</p>
                  {!user ? (
                    <button onClick={() => { setAuthOpen(true); }} className="mt-2 w-full rounded-xl bg-stone-900 text-amber-300 font-extrabold py-2.5 text-sm">🔒 Log in to bid</button>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input type="number" min={(selected.current_bid || 0) + 1} value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="flex-1 rounded-xl border border-stone-200 bg-cream-50 px-3 py-2.5 text-sm font-bold tick" />
                      <button onClick={placeBid} disabled={bidding} className="rounded-xl bg-amber-400 text-stone-900 font-extrabold px-5 py-2.5 text-sm hover:bg-amber-300 disabled:opacity-60">
                        {bidding ? 'Bidding…' : 'Bid'}
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-stone-500 font-semibold mt-2">Validation: logged in · auction active · bid &gt; current · sufficient coins. Only the winner pays, at settlement.</p>
                  {(user?.role === 'admin' || user?.id === selected.seller_id) && (
                    <button onClick={() => endAndSettle(selected)} className="mt-2 text-xs font-extrabold text-red-700 hover:underline">End auction now & settle winner</button>
                  )}
                </div>
              ) : selected.status === 'ended' ? (
                <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm font-extrabold flex items-center gap-1.5"><Trophy size={15} className="text-amber-600" /> Auction ended — ready to settle.</p>
                  {(user?.role === 'admin' || user?.id === selected.seller_id) ? (
                    <button onClick={() => endAndSettle(selected)} className="mt-2 rounded-xl bg-emerald-800 text-white text-sm font-extrabold px-4 py-2">Settle & transfer coins to winner</button>
                  ) : (
                    <p className="text-xs font-semibold text-stone-500 mt-1">The seller settles this auction; only the winner is charged.</p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-stone-100 border p-4 text-sm font-bold text-stone-600">This auction is settled. Winner paid securely; order + ledger entries created.</div>
              )}

              <div className="mt-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">Bid history</p>
                <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {bids.length === 0 && <p className="text-sm text-stone-500 font-semibold">No bids yet — be the first!</p>}
                  {bids.map((b, i) => (
                    <div key={b.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${i === 0 ? 'bg-amber-100 border border-amber-300' : 'bg-white border border-stone-200'}`}>
                      <span className="text-base">🧑‍🎓</span>
                      <span className="flex-1">{user ? b.bidder_name : 'Hidden bidder'}{i === 0 ? ' 👑 highest' : ''}</span>
                      <span className="tick">{user ? `◎ ${b.amount}` : '🔒'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/70" onClick={() => setShowCreate(false)}>
          <form onSubmit={create} className="w-full max-w-lg bg-cream-50 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-black text-2xl">Create auction</h2>
            <div className="grid gap-2.5 mt-4">
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. Vintage Film Camera)" className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description, condition, pickup…" rows={3} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold" />
              <div className="grid grid-cols-3 gap-2">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold">
                  {['Textbooks', 'Electronics', 'Furniture', 'Bikes', 'Clothing', 'Appliances', 'Sneakers', 'Instruments', 'Misc'].map((c) => <option key={c}>{c}</option>)}
                </select>
                <input required type="number" min={1} value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} placeholder="Start price" className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold tick" />
                <select value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold">
                  <option value="6">6 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">2 days</option>
                  <option value="72">3 days</option>
                  <option value="168">7 days</option>
                </select>
              </div>
            {/* PHOTO: local upload + browsable gallery + URL — shared with all users */}
            <div className="rounded-2xl border border-stone-200 bg-white p-3 mt-2.5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-stone-500">Auction photo · visible to all users</p>
              {form.image_url ? (
                <div className="relative mt-2">
                  <img src={form.image_url} alt="Preview" className="h-36 w-full object-cover rounded-xl border border-stone-200" />
                  <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="absolute top-2 right-2 rounded-full bg-stone-950/80 text-white text-xs font-bold px-2.5 py-1 hover:bg-stone-950">Remove</button>
                </div>
              ) : (
                <div className="mt-2 rounded-xl border-2 border-dashed border-stone-200 bg-cream-50 h-24 flex flex-col items-center justify-center text-stone-400">
                  <ImagePlus size={20} />
                  <p className="text-xs font-bold mt-1">No photo yet — add one below</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-1.5 mt-2.5 bg-stone-100 rounded-xl p-1 text-xs font-extrabold">
                <button type="button" onClick={() => setImageTab('upload')} className={`rounded-lg py-1.5 inline-flex items-center justify-center gap-1 ${imageTab === 'upload' ? 'bg-white shadow text-emerald-800' : 'text-stone-500'}`}><FolderOpen size={13} /> My device</button>
                <button type="button" onClick={() => setImageTab('gallery')} className={`rounded-lg py-1.5 inline-flex items-center justify-center gap-1 ${imageTab === 'gallery' ? 'bg-white shadow text-emerald-800' : 'text-stone-500'}`}><LayoutGrid size={13} /> Gallery</button>
                <button type="button" onClick={() => setImageTab('url')} className={`rounded-lg py-1.5 inline-flex items-center justify-center gap-1 ${imageTab === 'url' ? 'bg-white shadow text-emerald-800' : 'text-stone-500'}`}><Link2 size={13} /> URL</button>
              </div>
              {imageTab === 'upload' && (
                <div className="mt-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={readingFile} className="w-full rounded-xl bg-stone-900 text-white text-sm font-extrabold py-2.5 hover:bg-stone-700 disabled:opacity-60">
                    {readingFile ? 'Reading photo…' : '📁 Browse files on this device'}
                  </button>
                  <p className="text-[11px] font-semibold text-stone-500 mt-1.5">JPG / PNG / WebP up to 8MB — resized in-browser, stored with the listing so every user sees it.</p>
                </div>
              )}
              {imageTab === 'gallery' && (
                <div className="mt-2">
                  <p className="text-[11px] font-bold text-stone-500">Tap any photo to use it:</p>
                  <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                    {GALLERY_IMAGES.map((src) => (
                      <button key={src} type="button" onClick={() => { setForm({ ...form, image_url: src }); toast('Gallery photo selected.', 'success'); }} className={`rounded-lg overflow-hidden border-2 transition ${form.image_url === src ? 'border-emerald-600 ring-2 ring-emerald-300' : 'border-transparent hover:border-emerald-300'}`}>
                        <img src={src} alt="Gallery option" className="h-14 w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {imageTab === 'url' && (
                <input value={form.image_url.startsWith('data:') ? '' : form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://… (or auto-filled if blank)" className="mt-2 w-full rounded-xl border border-stone-200 bg-cream-50 px-3 py-2.5 text-sm font-semibold" />
              )}
            </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button>
              <button disabled={creating} className="flex-1 rounded-xl bg-emerald-800 text-white text-sm font-extrabold py-2.5 disabled:opacity-60">{creating ? 'Creating…' : 'Launch auction'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
