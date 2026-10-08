import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Missing user id.' });
      const { data, error } = await supabase.from('cm_wishlist').select('*').eq('user_id', user_id).order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const pids = rows.map((r) => r.product_id);
      const pmap = {};
      if (pids.length) {
        const { data: prods } = await supabase.from('cm_products').select('*').in('id', pids);
        (prods || []).forEach((p) => { pmap[p.id] = p; });
      }
      return res.status(200).json(rows.map((r) => ({ ...r, product: pmap[r.product_id] || null })).filter((r) => r.product));
    }

    if (req.method === 'POST') {
      const { user_id, product_id } = req.body || {};
      if (!user_id) return res.status(401).json({ error: 'Login required to use the wishlist.' });
      if (!product_id) return res.status(400).json({ error: 'Missing product.' });
      const { data: product } = await supabase.from('cm_products').select('id').eq('id', product_id).maybeSingle();
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      const { data: existing } = await supabase.from('cm_wishlist').select('id').eq('user_id', user_id).eq('product_id', product_id).maybeSingle();
      if (existing) {
        await supabase.from('cm_wishlist').delete().eq('id', existing.id);
        return res.status(200).json({ wishlisted: false });
      }
      const { data: created, error } = await supabase.from('cm_wishlist').insert({ user_id, product_id }).select().single();
      if (error) throw error;
      return res.status(201).json({ wishlisted: true, item: created });
    }

    if (req.method === 'DELETE') {
      const user_id = req.query.user_id || (req.body || {}).user_id;
      const product_id = req.query.product_id || (req.body || {}).product_id;
      if (!user_id || !product_id) return res.status(400).json({ error: 'Missing user or product.' });
      const { error } = await supabase.from('cm_wishlist').delete().eq('user_id', user_id).eq('product_id', product_id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('wishlist API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
