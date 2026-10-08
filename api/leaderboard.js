import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { limit = '20' } = req.query;
    const { data, error } = await supabase.from('cm_users').select('id, display_name, role, coins, avatar_emoji, created_at').order('coins', { ascending: false }).limit(Math.min(parseInt(limit) || 20, 50));
    if (error) throw error;
    return res.status(200).json((data || []).map((u, i) => ({ ...u, rank: i + 1 })));
  } catch (err) {
    console.error('leaderboard API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
