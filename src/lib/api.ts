export interface CMUser {
  id: number;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  display_name: string;
  coins: number;
  avatar_emoji: string;
  bio: string;
  referral_code: string;
  referred_by?: number | null;
  last_daily_reward?: string | null;
  created_at?: string | null;
}

export interface CMProduct {
  id: number;
  seller_id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  type: 'sell' | 'auction';
  price: number | null;
  starting_price: number | null;
  image_url: string;
  status: string;
  views: number;
  created_at?: string | null;
}

export interface CMAuction {
  id: number;
  product_id: number;
  seller_id: number;
  title: string;
  description: string;
  category: string;
  image_url: string;
  starting_price: number;
  current_bid: number;
  current_bidder_id: number | null;
  winner_id?: number | null;
  start_time: string;
  end_time: string;
  status: 'active' | 'ended' | 'settled';
  bids_count?: number;
}

export interface CMBid {
  id: number;
  auction_id: number;
  bidder_id: number;
  bidder_name: string;
  amount: number;
  created_at?: string | null;
  auction?: CMAuction | null;
}

export interface CMOrder {
  id: number;
  buyer_id: number;
  seller_id: number;
  product_id: number;
  auction_id: number | null;
  amount: number;
  status: string;
  created_at?: string | null;
  product?: { id: number; title: string; image_url: string; category: string } | null;
}

export interface CMTransaction {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at?: string | null;
}

export interface CMVirtualItem {
  id: number;
  name: string;
  description: string;
  price: number;
  emoji: string;
  rarity: string;
  perk: string;
}

export interface CMInventoryRow {
  id: number;
  user_id: number;
  item_id: number;
  created_at?: string | null;
  item?: CMVirtualItem | null;
}

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  signup: (payload: { email: string; password: string; role: string; display_name: string; referral_code?: string }) =>
    req('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signup', ...payload }) }) as Promise<CMUser>,
  login: (email: string, password: string) =>
    req('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) }) as Promise<CMUser>,
  getUser: (id: number) => req(`/api/auth?id=${id}`) as Promise<CMUser>,

  products: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/products${q ? `?${q}` : ''}`) as Promise<CMProduct[]>;
  },
  createProduct: (payload: Record<string, unknown>) =>
    req('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (payload: Record<string, unknown>) =>
    req('/api/products', { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProduct: (id: number, requester_id: number) =>
    req(`/api/products?id=${id}&requester_id=${requester_id}`, { method: 'DELETE' }),
  viewProduct: (id: number) =>
    req('/api/products', { method: 'PUT', body: JSON.stringify({ id, action: 'view' }) }),

  auctions: (status = '') => req(`/api/auctions${status ? `?status=${status}` : ''}`) as Promise<CMAuction[]>,
  createAuction: (payload: Record<string, unknown>) =>
    req('/api/auctions', { method: 'POST', body: JSON.stringify(payload) }) as Promise<CMAuction>,
  endAuction: (id: number, requester_id: number) =>
    req('/api/auctions', { method: 'PUT', body: JSON.stringify({ id, action: 'end', requester_id }) }),
  settleAuction: (id: number) =>
    req('/api/auctions', { method: 'PUT', body: JSON.stringify({ id, action: 'settle' }) }),

  bids: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/bids${q ? `?${q}` : ''}`) as Promise<CMBid[]>;
  },
  placeBid: (auction_id: number, bidder_id: number, amount: number) =>
    req('/api/bids', { method: 'POST', body: JSON.stringify({ auction_id, bidder_id, amount }) }) as Promise<CMBid>,

  orders: (user_id: number, view: 'buyer' | 'seller' = 'buyer') =>
    req(`/api/orders?user_id=${user_id}&view=${view}`) as Promise<CMOrder[]>,
  buy: (buyer_id: number, product_id: number) =>
    req('/api/orders', { method: 'POST', body: JSON.stringify({ buyer_id, product_id }) }),

  wishlist: (user_id: number) => req(`/api/wishlist?user_id=${user_id}`),
  toggleWishlist: (user_id: number, product_id: number) =>
    req('/api/wishlist', { method: 'POST', body: JSON.stringify({ user_id, product_id }) }),

  coins: (user_id: number) => req(`/api/coins?user_id=${user_id}`),
  dailyReward: (user_id: number) =>
    req('/api/coins', { method: 'POST', body: JSON.stringify({ action: 'daily', user_id }) }),
  transfer: (user_id: number, to_email: string, amount: number) =>
    req('/api/coins', { method: 'POST', body: JSON.stringify({ action: 'transfer', user_id, to_email, amount }) }),
  claimTask: (user_id: number, task_id: string) =>
    req('/api/coins', { method: 'POST', body: JSON.stringify({ action: 'task', user_id, task_id }) }),

  shop: () => req('/api/shop') as Promise<CMVirtualItem[]>,
  buyItem: (user_id: number, item_id: number) =>
    req('/api/shop', { method: 'POST', body: JSON.stringify({ user_id, item_id }) }),
  inventory: (user_id: number) => req(`/api/inventory?user_id=${user_id}`) as Promise<CMInventoryRow[]>,

  leaderboard: () => req('/api/leaderboard'),
  dashboard: (user_id: number) => req(`/api/dashboard?user_id=${user_id}`),
  admin: (admin_id: number) => req(`/api/admin?admin_id=${admin_id}`),
};

export const timeLeft = (end: string) => {
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
};

export const CATEGORIES = ['Textbooks', 'Electronics', 'Furniture', 'Bikes', 'Clothing', 'Appliances', 'Sneakers', 'Instruments', 'Misc'];
export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];
