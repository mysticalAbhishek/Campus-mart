import supabase from './db-client.js';

const strip = (u) => {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { admin_id } = req.query;
    if (!admin_id) return res.status(401).json({ error: 'Login required.' });
    const { data: admin } = await supabase.from('cm_users').select('*').eq('id', admin_id).maybeSingle();
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });

    const [users, products, auctions, orders, txns] = await Promise.all([
      supabase.from('cm_users').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('cm_products').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('cm_auctions').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('cm_orders').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('cm_transactions').select('*').order('created_at', { ascending: false }).limit(200),
    ]);

    const uRows = users.data || [];
    const pRows = products.data || [];
    const aRows = auctions.data || [];
    const oRows = orders.data || [];
    return res.status(200).json({
      users: uRows.map(strip),
      products: pRows,
      auctions: aRows,
      orders: oRows,
      transactions: txns.data || [],
      stats: {
        totalUsers: uRows.length,
        totalProducts: pRows.length,
        activeAuctions: aRows.filter((a) => a.status === 'active').length,
        totalOrders: oRows.length,
        coinsInCirculation: uRows.reduce((s, u) => s + (u.coins || 0), 0),
        soldCount: pRows.filter((p) => p.status === 'sold').length,
        volume: oRows.reduce((s, o) => s + (o.amount || 0), 0),
      },
    });
  } catch (err) {
    console.error('admin API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
