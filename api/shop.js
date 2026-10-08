import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('cm_virtual_items').select('*').order('price', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const { user_id, item_id } = req.body || {};
      if (!user_id) return res.status(401).json({ error: 'Login required to shop.' });
      if (!item_id) return res.status(400).json({ error: 'Missing item.' });
      const { data: user } = await supabase.from('cm_users').select('*').eq('id', user_id).maybeSingle();
      if (!user) return res.status(401).json({ error: 'Login required to shop.' });
      const { data: item } = await supabase.from('cm_virtual_items').select('*').eq('id', item_id).maybeSingle();
      if (!item) return res.status(404).json({ error: 'Item not found.' });
      const { data: owned } = await supabase.from('cm_inventory').select('id').eq('user_id', user_id).eq('item_id', item_id).maybeSingle();
      if (owned) return res.status(400).json({ error: 'You already own this item.' });
      if ((user.coins || 0) < item.price) return res.status(400).json({ error: `Insufficient coins. You have ${user.coins} but need ${item.price}.` });
      const bal = user.coins - item.price;
      await supabase.from('cm_users').update({ coins: bal }).eq('id', user_id);
      await supabase.from('cm_inventory').insert({ user_id, item_id });
      await supabase.from('cm_transactions').insert({ user_id, type: 'shop', amount: -item.price, balance_after: bal, description: `Shop purchase: ${item.name}` });
      return res.status(201).json({ ok: true, balance: bal });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('shop API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
