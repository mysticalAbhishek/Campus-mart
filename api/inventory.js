import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Missing user id.' });
      const { data, error } = await supabase.from('cm_inventory').select('*').eq('user_id', user_id).order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const iids = [...new Set(rows.map((r) => r.item_id))];
      const imap = {};
      if (iids.length) {
        const { data: items } = await supabase.from('cm_virtual_items').select('*').in('id', iids);
        (items || []).forEach((i) => { imap[i.id] = i; });
      }
      return res.status(200).json(rows.map((r) => ({ ...r, item: imap[r.item_id] || null })));
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('inventory API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
