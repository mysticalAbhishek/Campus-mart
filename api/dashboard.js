import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user id.' });
    const { data: user } = await supabase.from('cm_users').select('*').eq('id', user_id).maybeSingle();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password, ...profile } = user;

    const [purch, sales, bids, wish, inv, txns, listings, activeBids] = await Promise.all([
      supabase.from('cm_orders').select('amount').eq('buyer_id', user_id),
      supabase.from('cm_orders').select('amount').eq('seller_id', user_id),
      supabase.from('cm_bids').select('id').eq('bidder_id', user_id),
      supabase.from('cm_wishlist').select('id').eq('user_id', user_id),
      supabase.from('cm_inventory').select('id').eq('user_id', user_id),
      supabase.from('cm_transactions').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(10),
      supabase.from('cm_products').select('id').eq('seller_id', user_id).eq('status', 'active'),
      supabase.from('cm_auctions').select('id').eq('current_bidder_id', user_id).eq('status', 'active'),
    ]);

    const purchases = purch.data || [];
    const saleRows = sales.data || [];
    return res.status(200).json({
      profile,
      stats: {
        purchases: purchases.length,
        spent: purchases.reduce((s, o) => s + (o.amount || 0), 0),
        sales: saleRows.length,
        earned: saleRows.reduce((s, o) => s + (o.amount || 0), 0),
        bids: (bids.data || []).length,
        wishlist: (wish.data || []).length,
        inventory: (inv.data || []).length,
        activeListings: (listings.data || []).length,
        winningBids: (activeBids.data || []).length,
      },
      recentTransactions: txns.data || [],
    });
  } catch (err) {
    console.error('dashboard API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
