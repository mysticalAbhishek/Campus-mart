import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { status = '', limit = '100' } = req.query;
      let q = supabase.from('cm_auctions').select('*').order('end_time', { ascending: true }).limit(Math.min(parseInt(limit) || 100, 100));
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      const now = new Date();
      const rows = data || [];
      for (const a of rows) {
        if (a.status === 'active' && new Date(a.end_time) < now) {
          await supabase.from('cm_auctions').update({ status: 'ended' }).eq('id', a.id);
          a.status = 'ended';
        }
      }
      const { data: bids } = await supabase.from('cm_bids').select('auction_id');
      const counts = {};
      (bids || []).forEach((b) => { counts[b.auction_id] = (counts[b.auction_id] || 0) + 1; });
      return res.status(200).json(rows.map((a) => ({ ...a, bids_count: counts[a.id] || 0 })));
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const { seller_id, title, description = '', category = 'Misc', condition = 'Good', starting_price, duration_hours = 48, image_url = '' } = b;
      if (!seller_id) return res.status(401).json({ error: 'Login required to create an auction.' });
      const { data: seller } = await supabase.from('cm_users').select('*').eq('id', seller_id).maybeSingle();
      if (!seller) return res.status(401).json({ error: 'Login required to create an auction.' });
      if (!['seller', 'admin'].includes(seller.role)) return res.status(403).json({ error: 'Only sellers can create auctions.' });
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'Auction title is required.' });
      if (!starting_price || parseInt(starting_price) <= 0) return res.status(400).json({ error: 'Starting price must be a positive coin amount.' });
      const hrs = Math.min(Math.max(parseInt(duration_hours) || 48, 1), 336);
      const img = image_url || `https://picsum.photos/seed/auc-${Date.now().toString(36)}/640/420`;
      const { data: product, error: pErr } = await supabase.from('cm_products').insert({
        seller_id, title: String(title).trim(), description: String(description).trim(),
        category, condition, type: 'auction', price: null, starting_price: parseInt(starting_price),
        image_url: img, status: 'active', views: 0,
      }).select().single();
      if (pErr) throw pErr;
      const start = new Date();
      const end = new Date(start.getTime() + hrs * 3600 * 1000);
      const { data: auction, error: aErr } = await supabase.from('cm_auctions').insert({
        product_id: product.id, seller_id, title: product.title, description: product.description,
        category: product.category, image_url: product.image_url,
        starting_price: product.starting_price, current_bid: product.starting_price,
        current_bidder_id: null, start_time: start.toISOString(),
        end_time: end.toISOString(), status: 'active',
      }).select().single();
      if (aErr) throw aErr;
      return res.status(201).json(auction);
    }

    if (req.method === 'PUT') {
      const b = req.body || {};
      const { id, action, requester_id } = b;
      if (!id || !action) return res.status(400).json({ error: 'Missing auction id or action.' });
      const { data: auction } = await supabase.from('cm_auctions').select('*').eq('id', id).maybeSingle();
      if (!auction) return res.status(404).json({ error: 'Auction not found.' });

      if (action === 'end') {
        if (!requester_id) return res.status(401).json({ error: 'Login required.' });
        const { data: req1 } = await supabase.from('cm_users').select('*').eq('id', requester_id).maybeSingle();
        if (!req1) return res.status(401).json({ error: 'Login required.' });
        if (req1.role !== 'admin' && auction.seller_id !== requester_id) return res.status(403).json({ error: 'Only the auction owner can end it.' });
        if (auction.status !== 'active') return res.status(400).json({ error: 'Auction is not active.' });
        const { data: upd, error } = await supabase.from('cm_auctions').update({ status: 'ended' }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json(upd);
      }

      if (action === 'settle') {
        if (auction.status === 'settled') return res.status(400).json({ error: 'Auction already settled.' });
        if (auction.status === 'active' && new Date(auction.end_time) > new Date()) {
          return res.status(400).json({ error: 'Auction has not ended yet.' });
        }
        const { data: bids } = await supabase.from('cm_bids').select('*').eq('auction_id', id).order('amount', { ascending: false });
        if (!bids || bids.length === 0) {
          await supabase.from('cm_auctions').update({ status: 'settled' }).eq('id', id);
          await supabase.from('cm_products').update({ status: 'ended' }).eq('id', auction.product_id);
          return res.status(200).json({ settled: true, winner: null, message: 'Auction ended with no bids.' });
        }
        let winnerBid = null;
        let winner = null;
        for (const bid of bids) {
          const { data: u } = await supabase.from('cm_users').select('*').eq('id', bid.bidder_id).maybeSingle();
          if (u && (u.coins || 0) >= bid.amount) { winnerBid = bid; winner = u; break; }
        }
        if (!winnerBid || !winner) {
          await supabase.from('cm_auctions').update({ status: 'settled' }).eq('id', id);
          await supabase.from('cm_products').update({ status: 'ended' }).eq('id', auction.product_id);
          return res.status(400).json({ error: 'No bidder can afford the winning bid. Auction closed without a sale.' });
        }
        const { data: seller } = await supabase.from('cm_users').select('*').eq('id', auction.seller_id).maybeSingle();
        if (!seller) return res.status(500).json({ error: 'Seller account missing.' });
        const amount = winnerBid.amount;
        const winnerBal = winner.coins - amount;
        const sellerBal = (seller.coins || 0) + amount;
        await supabase.from('cm_users').update({ coins: winnerBal }).eq('id', winner.id);
        await supabase.from('cm_users').update({ coins: sellerBal }).eq('id', seller.id);
        const { data: order } = await supabase.from('cm_orders').insert({
          buyer_id: winner.id, seller_id: seller.id, product_id: auction.product_id,
          auction_id: auction.id, amount, status: 'completed',
        }).select().single();
        await supabase.from('cm_transactions').insert([
          { user_id: winner.id, type: 'bid_win', amount: -amount, balance_after: winnerBal, description: `Won auction: ${auction.title}` },
          { user_id: seller.id, type: 'sale', amount, balance_after: sellerBal, description: `Auction sale: ${auction.title}` },
        ]);
        await supabase.from('cm_products').update({ status: 'sold' }).eq('id', auction.product_id);
        await supabase.from('cm_auctions').update({ status: 'settled', winner_id: winner.id, current_bid: amount, current_bidder_id: winner.id }).eq('id', id);
        return res.status(200).json({ settled: true, winner: { id: winner.id, display_name: winner.display_name }, amount, order });
      }

      return res.status(400).json({ error: 'Unknown action.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('auctions API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
