import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { search = '', category = '', condition = '', type = '', sort = 'newest', seller_id = '', status = 'active', minPrice = '', maxPrice = '', limit = '200' } = req.query;
      let query = supabase.from('cm_products').select('*').order('created_at', { ascending: false }).limit(Math.min(parseInt(limit) || 200, 200));
      if (seller_id) query = query.eq('seller_id', seller_id);
      else if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);
      if (condition) query = query.eq('condition', condition);
      if (type) query = query.eq('type', type);
      if (search) query = query.ilike('title', `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      let rows = data || [];
      const lo = minPrice !== '' ? parseInt(minPrice) : null;
      const hi = maxPrice !== '' ? parseInt(maxPrice) : null;
      if (lo !== null || hi !== null) {
        rows = rows.filter((p) => {
          const pr = p.type === 'auction' ? (p.starting_price || 0) : (p.price || 0);
          return (lo === null || pr >= lo) && (hi === null || pr <= hi);
        });
      }
      if (sort === 'price_asc') rows = [...rows].sort((a, b) => (a.type === 'auction' ? a.starting_price : a.price) - (b.type === 'auction' ? b.starting_price : b.price));
      else if (sort === 'price_desc') rows = [...rows].sort((a, b) => (b.type === 'auction' ? b.starting_price : b.price) - (a.type === 'auction' ? a.starting_price : a.price));
      else if (sort === 'popular') rows = [...rows].sort((a, b) => (b.views || 0) - (a.views || 0));
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const { seller_id, title, description = '', category = 'Misc', condition = 'Good', type = 'sell', price, starting_price, image_url = '', duration_hours = 48 } = b;
      if (!seller_id) return res.status(401).json({ error: 'Login required to list a product.' });
      const { data: seller } = await supabase.from('cm_users').select('*').eq('id', seller_id).maybeSingle();
      if (!seller) return res.status(401).json({ error: 'Login required to list a product.' });
      if (!['seller', 'admin'].includes(seller.role)) return res.status(403).json({ error: 'Only sellers can list products.' });
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'Product title is required.' });
      if (type === 'sell') {
        if (!price || parseInt(price) <= 0) return res.status(400).json({ error: 'Fixed price must be a positive coin amount.' });
      } else {
        if (!starting_price || parseInt(starting_price) <= 0) return res.status(400).json({ error: 'Starting price must be a positive coin amount.' });
      }
      const img = image_url || `https://picsum.photos/seed/cm-${Date.now().toString(36)}/640/420`;
      const { data: product, error } = await supabase.from('cm_products').insert({
        seller_id, title: String(title).trim(), description: String(description).trim(),
        category, condition, type, price: type === 'sell' ? parseInt(price) : null,
        starting_price: type === 'auction' ? parseInt(starting_price) : null,
        image_url: img, status: 'active', views: 0,
      }).select().single();
      if (error) throw error;

      let auction = null;
      if (type === 'auction') {
        const hrs = Math.min(Math.max(parseInt(duration_hours) || 48, 1), 336);
        const start = new Date();
        const end = new Date(start.getTime() + hrs * 3600 * 1000);
        const { data: a, error: aErr } = await supabase.from('cm_auctions').insert({
          product_id: product.id, seller_id, title: product.title,
          description: product.description, category: product.category,
          image_url: product.image_url, starting_price: product.starting_price,
          current_bid: product.starting_price, current_bidder_id: null,
          start_time: start.toISOString(), end_time: end.toISOString(), status: 'active',
        }).select().single();
        if (aErr) throw aErr;
        auction = a;
      }
      return res.status(201).json({ product, auction });
    }

    if (req.method === 'PUT') {
      const b = req.body || {};
      const { id, requester_id, action } = b;
      if (!id) return res.status(400).json({ error: 'Missing product id.' });
      const { data: product } = await supabase.from('cm_products').select('*').eq('id', id).maybeSingle();
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      if (action === 'view') {
        await supabase.from('cm_products').update({ views: (product.views || 0) + 1 }).eq('id', id);
        return res.status(200).json({ ok: true });
      }
      if (!requester_id) return res.status(401).json({ error: 'Login required.' });
      const { data: requester } = await supabase.from('cm_users').select('*').eq('id', requester_id).maybeSingle();
      if (!requester) return res.status(401).json({ error: 'Login required.' });
      if (requester.role !== 'admin' && product.seller_id !== requester_id) {
        return res.status(403).json({ error: "Unauthorized: sellers can only edit their own products." });
      }
      if (product.status === 'sold') return res.status(400).json({ error: 'Sold products cannot be edited.' });
      const allowed = {};
      for (const k of ['title', 'description', 'category', 'condition', 'price', 'image_url', 'status']) {
        if (b[k] !== undefined) allowed[k] = b[k];
      }
      if (allowed.price !== undefined) {
        if (parseInt(allowed.price) <= 0) return res.status(400).json({ error: 'Price must be positive.' });
        allowed.price = parseInt(allowed.price);
      }
      const { data: updated, error } = await supabase.from('cm_products').update(allowed).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || (req.body || {}).id;
      const requester_id = req.query.requester_id || (req.body || {}).requester_id;
      if (!id) return res.status(400).json({ error: 'Missing product id.' });
      if (!requester_id) return res.status(401).json({ error: 'Login required.' });
      const { data: product } = await supabase.from('cm_products').select('*').eq('id', id).maybeSingle();
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      const { data: requester } = await supabase.from('cm_users').select('*').eq('id', requester_id).maybeSingle();
      if (!requester) return res.status(401).json({ error: 'Login required.' });
      if (requester.role !== 'admin' && product.seller_id !== requester_id) {
        return res.status(403).json({ error: "Unauthorized: sellers can only delete their own products." });
      }
      if (product.status === 'sold') return res.status(400).json({ error: 'Sold products cannot be deleted.' });
      await supabase.from('cm_wishlist').delete().eq('product_id', id);
      await supabase.from('cm_auctions').delete().eq('product_id', id);
      const { error } = await supabase.from('cm_products').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('products API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
