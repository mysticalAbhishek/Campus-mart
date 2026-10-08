import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Store, ImagePlus, LayoutGrid, Link2, FolderOpen } from 'lucide-react';
import { api, CATEGORIES, CONDITIONS, type CMProduct } from '../lib/api';
import { useStore } from '../lib/store';
import { PriceTag } from '../components/ui';

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

export default function Sell() {
  const { user, toast, setAuthOpen, refreshUser } = useStore();
  const [listings, setListings] = useState<CMProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CMProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Textbooks', condition: 'Good', type: 'sell', price: '', starting_price: '', duration_hours: '48', image_url: '' });
  const [imageTab, setImageTab] = useState<'upload' | 'gallery' | 'url'>('upload');
  const [readingFile, setReadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      setListings(await api.products({ seller_id: String(user.id), status: '' }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <div className="rounded-3xl bg-white border p-10">
          <Store size={36} className="mx-auto text-emerald-700" />
          <h1 className="font-display font-black text-3xl mt-2">Sell on Campus Mart</h1>
          <p className="text-sm text-stone-500 font-semibold mt-1">Log in as a seller to list fixed-price products or auctions.</p>
          <button onClick={() => setAuthOpen(true)} className="mt-4 rounded-xl bg-emerald-800 text-white font-extrabold px-6 py-3">Log in / Join as seller</button>
        </div>
      </div>
    );
  }

  if (user.role === 'buyer') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <div className="rounded-3xl bg-white border p-10">
          <h1 className="font-display font-black text-3xl">Buyers can't list items</h1>
          <p className="text-sm text-stone-500 font-semibold mt-2">Your account is a <b>buyer</b>. Sign up as a <b>seller</b> (e.g. seller@campusmart.demo / demo1234) to add products — the backend enforces this too.</p>
          <button onClick={() => setAuthOpen(true)} className="mt-4 rounded-xl bg-stone-900 text-white font-extrabold px-6 py-3">Switch account</button>
        </div>
      </div>
    );
  }

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', category: 'Textbooks', condition: 'Good', type: 'sell', price: '', starting_price: '', duration_hours: '48', image_url: '' });
    setImageTab('upload');
    setShowForm(true);
  };

  const openEdit = (p: CMProduct) => {
    setEditing(p);
    setForm({
      title: p.title, description: p.description || '', category: p.category, condition: p.condition,
      type: p.type, price: p.price ? String(p.price) : '', starting_price: p.starting_price ? String(p.starting_price) : '',
      duration_hours: '48', image_url: p.image_url || '',
    });
    setImageTab(p.image_url?.startsWith('data:') ? 'upload' : 'url');
    setShowForm(true);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Please choose an image file (JPG/PNG/WebP).', 'error'); return; }
    if (file.size > 8 * 1024 * 1024) { toast('Image is too large — please pick a file under 8MB.', 'error'); return; }
    setReadingFile(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm((f) => ({ ...f, image_url: dataUrl }));
      toast('Photo attached — it will be visible to all users once published.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not read image.', 'error');
    } finally {
      setReadingFile(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await api.updateProduct({
          id: editing.id, requester_id: user.id,
          title: form.title, description: form.description, category: form.category,
          condition: form.condition, image_url: form.image_url || undefined,
          ...(form.type === 'sell' && form.price ? { price: parseInt(form.price) } : {}),
        });
        toast('Listing updated.', 'success');
      } else {
        await api.createProduct({
          seller_id: user.id, title: form.title, description: form.description,
          category: form.category, condition: form.condition, type: form.type,
          price: form.price ? parseInt(form.price) : undefined,
          starting_price: form.starting_price ? parseInt(form.starting_price) : undefined,
          duration_hours: parseInt(form.duration_hours), image_url: form.image_url || undefined,
        });
        toast(form.type === 'auction' ? 'Product + live auction created!' : 'Product listed — visible to everyone in the marketplace!', 'success');
      }
      setShowForm(false);
      await fetchAll();
      await refreshUser();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: CMProduct) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try {
      await api.deleteProduct(p.id, user.id);
      toast('Listing deleted.', 'success');
      await fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Seller studio</p>
          <h1 className="font-display font-black text-3xl md:text-4xl">Your listings ({listings.length})</h1>
          <p className="text-sm text-stone-500 font-semibold">Ownership is enforced server-side — you can only edit your own products.</p>
        </div>
        <button onClick={openNew} className="rounded-xl bg-emerald-800 text-white text-sm font-extrabold px-4 py-2.5 inline-flex items-center gap-1.5 hover:bg-emerald-700">
          <Plus size={15} /> List item / auction
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm font-bold text-stone-500">Loading…</p>
      ) : listings.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white border p-10 text-center">
          <p className="font-display font-black text-2xl">No listings yet</p>
          <p className="text-sm text-stone-500 font-semibold">List your first item — upload a photo from your device or pick from the gallery. Buyers pay in Campus Coins, credited to you.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {listings.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white border border-stone-200 overflow-hidden card-lift">
              <img src={p.image_url} alt={p.title} className="h-40 w-full object-cover" loading="lazy" />
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase rounded-full px-2 py-0.5 ${p.type === 'auction' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.type === 'auction' ? 'AUCTION' : 'SELL NOW'}</span>
                  <span className={`text-[10px] font-extrabold uppercase rounded-full px-2 py-0.5 ${p.status === 'active' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500'}`}>{p.status}</span>
                </div>
                <p className="font-extrabold mt-1.5 leading-snug">{p.title}</p>
                <div className="mt-1"><PriceTag value={(p.type === 'auction' ? p.starting_price : p.price) || 0} /></div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(p)} className="flex-1 rounded-xl border-2 border-stone-200 text-xs font-extrabold py-2 inline-flex items-center justify-center gap-1 hover:border-emerald-400"><Pencil size={13} /> Edit</button>
                  <button onClick={() => remove(p)} className="flex-1 rounded-xl border-2 border-red-100 text-red-600 text-xs font-extrabold py-2 inline-flex items-center justify-center gap-1 hover:bg-red-50"><Trash2 size={13} /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/70" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} className="w-full max-w-lg bg-cream-50 rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-black text-2xl">{editing ? 'Edit listing' : 'New listing'}</h2>
            <div className="grid gap-2.5 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: 'sell' })} className={`rounded-xl border-2 py-2.5 text-sm font-extrabold ${form.type === 'sell' ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-500'}`}>💰 Sell Now (fixed)</button>
                <button type="button" onClick={() => setForm({ ...form, type: 'auction' })} className={`rounded-xl border-2 py-2.5 text-sm font-extrabold ${form.type === 'auction' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-stone-200 bg-white text-stone-500'}`}>🔨 Auction</button>
              </div>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description, condition, pickup location…" rows={3} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold">
                  {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              {form.type === 'sell' ? (
                <input required={!editing} type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Fixed price in coins (e.g. 85)" className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold tick" />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input required={!editing} type="number" min={1} value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} placeholder="Starting price" className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold tick" />
                  <select value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold">
                    <option value="6">6 hours</option><option value="24">24 hours</option><option value="48">2 days</option><option value="72">3 days</option><option value="168">7 days</option>
                  </select>
                </div>
              )}

              {/* PHOTO: upload from device + gallery + URL — saved to shared listing */}
              <div className="rounded-2xl border border-stone-200 bg-white p-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-stone-500">Product photo · visible to all users</p>
                {form.image_url ? (
                  <div className="relative mt-2">
                    <img src={form.image_url} alt="Preview" className="h-40 w-full object-cover rounded-xl border border-stone-200" />
                    <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="absolute top-2 right-2 rounded-full bg-stone-950/80 text-white text-xs font-bold px-2.5 py-1 hover:bg-stone-950">Remove</button>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border-2 border-dashed border-stone-200 bg-cream-50 h-28 flex flex-col items-center justify-center text-stone-400">
                    <ImagePlus size={22} />
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
                    <p className="text-[11px] font-semibold text-stone-500 mt-1.5">JPG / PNG / WebP up to 8MB. Resized in-browser, then stored with your listing so every user sees it.</p>
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
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button>
              <button disabled={busy} className="flex-1 rounded-xl bg-emerald-800 text-white text-sm font-extrabold py-2.5 disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
