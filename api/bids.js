import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { auction_id, bidder_id, limit = '100' } = req.query;
      let q = supabase.from('cm_bids').select('*').order('amount', { ascending: false }).limit(Math.min(parseInt(limit) || 100, 200));
      if (auction_id) q = q.eq('auction_id', auction_id);
      if (bidder_id) q = q.eq('bidder_id', bidder_id);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      const ids = [...new Set(rows.map((r) => r.bidder_id))];
      const names = {};
      if (ids.length) {
        const { data: users } = await supabase.from('cm_users').select('id, display_name').in('id', ids);
        (users || []).forEach((u) => { names[u.id] = u.display_name; });
      }
      const auctions = {};
      if (bidder_id) {
        const aids = [...new Set(rows.map((r) => r.auction_id))];
        if (aids.length) {
          const { data: ad } = await supabase.from('cm_auctions').select('id, title, status, end_time, current_bid').in('id', aids);
          (ad || []).forEach((a) => { auctions[a.id] = a; });
        }
      }
      return res.status(200).json(rows.map((r) => ({ ...r, bidder_name: names[r.bidder_id] || 'Student', auction: auctions[r.auction_id] || null })));
    }

    if (req.method === 'POST') {
      const { auction_id, bidder_id, amount } = req.body || {};
      if (!bidder_id) return res.status(401).json({ error: 'Login required to bid.' });
      if (!auction_id) return res.status(400).json({ error: 'Missing auction.' });
      const bidAmount = parseInt(amount);
      if (!bidAmount || bidAmount <= 0) return res.status(400).json({ error: 'Bid must be a positive coin amount.' });

      const { data: bidder } = await supabase.from('cm_users').select('*').eq('id', bidder_id).maybeSingle();
      if (!bidder) return res.status(401).json({ error: 'Login required to bid.' });
      const { data: auction } = await supabase.from('cm_auctions').select('*').eq('id', auction_id).maybeSingle();
      if (!auction) return res.status(404).json({ error: 'Auction not found.' });
      if (auction.status !== 'active') return res.status(400).json({ error: 'This auction has ended.' });
      if (new Date(auction.end_time) < new Date()) {
        await supabase.from('cm_auctions').update({ status: 'ended' }).eq('id', auction_id);
        return res.status(400).json({ error: 'This auction has ended.' });
      }
      if (auction.seller_id === bidder_id) return res.status(400).json({ error: 'You cannot bid on your own auction.' });
      const floor = Math.max(auction.current_bid || 0, auction.starting_price || 0);
      if (bidAmount <= floor) return res.status(400).json({ error: `Bid must be higher than the current bid of ${floor} coins.` });
      if ((bidder.coins || 0) < bidAmount) return res.status(400).json({ error: `Insufficient coins. You have ${bidder.coins} but bid ${bidAmount}.` });

      const { data: bid, error } = await supabase.from('cm_bids').insert({
        auction_id, bidder_id, bidder_name: bidder.display_name, amount: bidAmount,
      }).select().single();
      if (error) throw error;
      await supabase.from('cm_auctions').update({ current_bid: bidAmount, current_bidder_id: bidder_id }).eq('id', auction_id);
      return res.status(201).json(bid);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('bids API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
