import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Gavel, Coins, Trophy, ArrowRight, Eye, ShieldCheck, Sparkles, BadgeCheck, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { LockedPrice, PriceTag } from '../components/ui';

export default function Home() {
  const { user, setAuthOpen, toast } = useStore();
  const [products, setProducts] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, a, l] = await Promise.all([api.products({ limit: '8' }), api.auctions('active'), api.leaderboard()]);
        setProducts(p);
        setAuctions(a.slice(0, 3));
        setLeaders(l.slice(0, 5));
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to load homepage', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cats = [
    { name: 'Textbooks', emoji: '📚', blurb: 'Stewart, Psych & more' },
    { name: 'Electronics', emoji: '🎧', blurb: 'Audio, tablets, gear' },
    { name: 'Furniture', emoji: '🪑', blurb: 'Dorm-ready finds' },
    { name: 'Bikes', emoji: '🚲', blurb: 'Commute in style' },
    { name: 'Sneakers', emoji: '👟', blurb: 'Limited colorways' },
    { name: 'Instruments', emoji: '🎸', blurb: 'Guitars & cases' },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="bg-campus-950 text-cream-50 hero-grid-bg overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-xs font-bold text-amber-300">
              <Sparkles size={13} /> Virtual coins only · no real money · student marketplace + auctions
            </div>
            <h1 className="font-display font-black text-4xl md:text-6xl leading-[1.02] mt-4">
              Buy, sell & bid<br />with <span className="text-amber-400">Campus Coins</span>
            </h1>
            <p className="mt-4 text-cream-100/75 text-base md:text-lg max-w-lg">
              Every new student gets <b className="text-amber-300">500 Campus Coins</b>. Browse freely as a guest — prices unlock when you log in. Sellers list fixed-price goods or live auctions.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/market" className="rounded-xl bg-amber-400 text-stone-900 font-extrabold px-5 py-3 hover:bg-amber-300 transition inline-flex items-center gap-2">
                <Store size={17} /> Browse marketplace
              </Link>
              <Link to="/auctions" className="rounded-xl bg-white/10 border border-white/20 font-extrabold px-5 py-3 hover:bg-white/20 transition inline-flex items-center gap-2">
                <Gavel size={17} /> Live auctions
              </Link>
              {!user && (
                <button onClick={() => setAuthOpen(true)} className="rounded-xl bg-emerald-600 font-extrabold px-5 py-3 hover:bg-emerald-500 transition">
                  Join free · +500 coins
                </button>
              )}
            </div>
            <div className="flex items-center gap-5 mt-7 text-sm font-bold text-cream-100/70">
              <span className="flex items-center gap-1.5"><Eye size={15} className="text-amber-300" /> Guests browse · prices hidden</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-400" /> Backend-validated trades</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-900 to-campus-950 border border-white/15 p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-cream-100/60">Campus Coin wallet</p>
                <span className="text-xs font-bold bg-amber-400/20 text-amber-300 rounded-full px-2.5 py-1">VIRTUAL</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="w-16 h-16 rounded-full coin-shine flex items-center justify-center text-3xl font-black text-white shadow-xl">C</div>
                <div>
                  <p className="font-display font-black text-4xl tick">{user ? user.coins : '500'}</p>
                  <p className="text-xs font-bold text-cream-100/60">{user ? `${user.display_name} · ${user.role}` : 'Signup bonus for every student'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                {[['+25', 'Daily reward'], ['+50', 'Referral bonus'], ['+15–40', 'Task rewards']].map(([a, b]) => (
                  <div key={b} className="rounded-xl bg-white/8 border border-white/10 py-2.5">
                    <p className="font-extrabold text-amber-300">{a}</p>
                    <p className="text-[11px] font-bold text-cream-100/60">{b}</p>
                  </div>
                ))}
              </div>
              <Link to="/coins" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white text-stone-900 font-extrabold py-2.5 text-sm hover:bg-amber-200 transition">
                <Coins size={16} /> Earn & transfer coins <ArrowRight size={15} />
              </Link>
            </div>
            <div className="absolute -top-4 -right-3 rotate-6 rounded-2xl bg-amber-400 text-stone-900 font-extrabold text-xs px-3 py-2 shadow-xl">No real money 💛</div>
          </motion.div>
        </div>

        <div className="border-t border-white/10 bg-black/20 overflow-hidden py-2.5">
          <div className="marquee-track flex gap-10 whitespace-nowrap text-xs font-bold text-cream-100/60 w-max">
            {[0, 1].map((k) => (
              <span key={k} className="flex gap-10">
                <span>🔒 LOGGED-OUT VISITORS SEE NO PRICES</span><span>🪙 EVERY SIGNUP GETS 500 CAMPUS COINS</span><span>🔨 ONLY AUCTION WINNERS PAY</span><span>🎁 DAILY REWARD +25 (ONCE/DAY)</span><span>🛡️ SELLERS CAN ONLY EDIT THEIR OWN LISTINGS</span><span>🏆 LEADERBOARD RANKS BY COIN BALANCE</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Categories</p>
            <h2 className="font-display font-black text-3xl">Shop the quad</h2>
          </div>
          <Link to="/market" className="text-sm font-extrabold text-emerald-800 inline-flex items-center gap-1 hover:gap-2 transition-all">View all <ArrowRight size={15} /></Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          {cats.map((c) => (
            <Link key={c.name} to={`/market?category=${encodeURIComponent(c.name)}`} className="card-lift rounded-2xl bg-white border border-stone-200 p-4 text-center">
              <div className="text-3xl">{c.emoji}</div>
              <p className="font-extrabold text-sm mt-2">{c.name}</p>
              <p className="text-[11px] text-stone-500 font-semibold">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED MARKETPLACE */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Marketplace</p>
            <h2 className="font-display font-black text-3xl">Fresh listings</h2>
          </div>
          <Link to="/market" className="text-sm font-extrabold text-emerald-800 inline-flex items-center gap-1">Open marketplace <ArrowRight size={15} /></Link>
        </div>
        {loading ? (
          <p className="mt-6 text-sm font-bold text-stone-500">Loading listings…</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {products.filter((p) => p.type === 'sell').slice(0, 4).map((p) => (
              <Link key={p.id} to="/market" className="card-lift rounded-2xl bg-white border border-stone-200 overflow-hidden">
                <img src={p.image_url} alt={p.title} className="h-36 w-full object-cover" loading="lazy" />
                <div className="p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{p.category} · {p.condition}</p>
                  <p className="font-extrabold text-sm line-clamp-2 leading-snug">{p.title}</p>
                  <div className="mt-2">{user ? <PriceTag value={p.price} /> : <LockedPrice />}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* AUCTIONS + LEADERBOARD */}
      <section className="bg-campus-950 text-cream-50">
        <div className="max-w-7xl mx-auto px-4 py-12 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-end justify-between">
              <h2 className="font-display font-black text-3xl flex items-center gap-2"><Gavel className="text-amber-400" /> Ending soon</h2>
              <Link to="/auctions" className="text-sm font-extrabold text-amber-300 inline-flex items-center gap-1">All auctions <ArrowRight size={15} /></Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              {auctions.map((a) => (
                <Link key={a.id} to="/auctions" className="rounded-2xl overflow-hidden bg-white/8 border border-white/12 card-lift">
                  <img src={a.image_url} alt={a.title} className="h-32 w-full object-cover" loading="lazy" />
                  <div className="p-3">
                    <p className="font-extrabold text-sm line-clamp-2 leading-snug">{a.title}</p>
                    <div className="mt-2 text-sm">{user ? <span className="font-extrabold text-amber-300 tick">◎ {a.current_bid}</span> : <span className="text-xs font-bold text-cream-100/60">🔒 Log in to see bids</span>}</div>
                    <p className="text-[11px] font-bold text-cream-100/50 mt-1">{a.bids_count || 0} bids</p>
                  </div>
                </Link>
              ))}
              {auctions.length === 0 && <p className="text-sm text-cream-100/60">No live auctions right now.</p>}
            </div>
          </div>
          <div className="rounded-2xl bg-white/8 border border-white/12 p-5">
            <h3 className="font-display font-black text-xl flex items-center gap-2"><Trophy className="text-amber-400" /> Top holders</h3>
            <div className="mt-3 flex flex-col gap-2">
              {leaders.map((l: any, i: number) => (
                <div key={l.id} className="flex items-center gap-2 bg-black/25 rounded-xl px-3 py-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-400 text-stone-900' : 'bg-white/15'}`}>{i + 1}</span>
                  <span className="text-lg">{l.avatar_emoji}</span>
                  <span className="flex-1 text-sm font-bold truncate">{l.display_name}</span>
                  <span className="text-xs font-extrabold text-amber-300 tick">◎ {l.coins}</span>
                </div>
              ))}
            </div>
            <Link to="/leaderboard" className="mt-3 block text-center rounded-xl bg-amber-400 text-stone-900 text-sm font-extrabold py-2.5 hover:bg-amber-300">Full leaderboard</Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-3">
        {[
          { icon: BadgeCheck, t: 'Signup → 500 coins', d: 'Buyers & sellers only. Admins are seeded — never public.' },
          { icon: Zap, t: 'Buy instantly or bid', d: 'Fixed-price checkout moves coins; auctions charge only the winner.' },
          { icon: Coins, t: 'Earn daily +25', d: 'Daily rewards, tasks, referrals and peer transfers — all ledgered.' },
          { icon: ShieldCheck, t: 'Backend enforces rules', d: 'Ownership checks, balance checks and price hiding live server-side.' },
        ].map((s) => (
          <div key={s.t} className="rounded-2xl bg-white border border-stone-200 p-5 card-lift">
            <s.icon className="text-emerald-700" size={22} />
            <p className="font-extrabold mt-2">{s.t}</p>
            <p className="text-sm text-stone-600 font-medium mt-1">{s.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
