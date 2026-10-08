import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id, view = 'buyer', limit = '100' } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Missing user id.' });
      const col = view === 'seller' ? 'seller_id' : 'buyer_id';
      const { data, error } = await supabase.from('cm_orders').select('*').eq(col, user_id).order('created_at', { ascending: false }).limit(Math.min(parseInt(limit) || 100, 200));
      if (error) throw error;
      const rows = data || [];
      const pids = [...new Set(rows.map((r) => r.product_id).filter(Boolean))];
      const pmap = {};
      if (pids.length) {
        const { data: prods } = await supabase.from('cm_products').select('id, title, image_url, category').in('id', pids);
        (prods || []).forEach((p) => { pmap[p.id] = p; });
      }
      return res.status(200).json(rows.map((r) => ({ ...r, product: pmap[r.product_id] || null })));
    }

    if (req.method === 'POST') {
      const { buyer_id, product_id } = req.body || {};
      if (!buyer_id) return res.status(401).json({ error: 'Login required to buy.' });
      if (!product_id) return res.status(400).json({ error: 'Missing product.' });
      const { data: buyer } = await supabase.from('cm_users').select('*').eq('id', buyer_id).maybeSingle();
      if (!buyer) return res.status(401).json({ error: 'Login required to buy.' });
      const { data: product } = await supabase.from('cm_products').select('*').eq('id', product_id).maybeSingle();
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      if (product.status !== 'active') return res.status(400).json({ error: 'This product is no longer available.' });
      if (product.type !== 'sell') return res.status(400).json({ error: 'Auction items must be won through bidding.' });
      if (product.seller_id === buyer_id) return res.status(400).json({ error: 'You cannot buy your own product.' });
      const price = product.price || 0;
      if ((buyer.coins || 0) < price) return res.status(400).json({ error: `Insufficient coins. You have ${buyer.coins} but need ${price}.` });
      const { data: seller } = await supabase.from('cm_users').select('*').eq('id', product.seller_id).maybeSingle();
      if (!seller) return res.status(500).json({ error: 'Seller account missing.' });

      const buyerBal = buyer.coins - price;
      const sellerBal = (seller.coins || 0) + price;
      await supabase.from('cm_users').update({ coins: buyerBal }).eq('id', buyer.id);
      await supabase.from('cm_users').update({ coins: sellerBal }).eq('id', seller.id);
      const { data: order, error: oErr } = await supabase.from('cm_orders').insert({
        buyer_id: buyer.id, seller_id: seller.id, product_id: product.id,
        auction_id: null, amount: price, status: 'completed',
      }).select().single();
      if (oErr) throw oErr;
      await supabase.from('cm_transactions').insert([
        { user_id: buyer.id, type: 'purchase', amount: -price, balance_after: buyerBal, description: `Purchased: ${product.title}` },
        { user_id: seller.id, type: 'sale', amount: price, balance_after: sellerBal, description: `Sold: ${product.title}` },
      ]);
      await supabase.from('cm_products').update({ status: 'sold' }).eq('id', product.id);
      await supabase.from('cm_wishlist').delete().eq('product_id', product.id);
      return res.status(201).json({ order, buyer_balance: buyerBal });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
