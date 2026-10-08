import supabase from './db-client.js';

const TASKS = {
  explorer: { label: 'Campus Explorer', desc: 'Browse 5 products in the marketplace', reward: 15 },
  wishlist3: { label: 'Window Shopper', desc: 'Save 3 items to your wishlist', reward: 20 },
  first_bid: { label: 'First Bid', desc: 'Place your first auction bid', reward: 20 },
  first_purchase: { label: 'First Purchase', desc: 'Complete your first purchase', reward: 40 },
  first_sale: { label: 'First Sale', desc: 'Make your first sale (sellers)', reward: 40 },
};

const sameDay = (a, b) => {
  const x = new Date(a); const y = new Date(b);
  return x.getUTCFullYear() === y.getUTCFullYear() && x.getUTCMonth() === y.getUTCMonth() && x.getUTCDate() === y.getUTCDate();
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Missing user id.' });
      const { data: user } = await supabase.from('cm_users').select('*').eq('id', user_id).maybeSingle();
      if (!user) return res.status(404).json({ error: 'User not found.' });
      const { data: history } = await supabase.from('cm_transactions').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(50);
      const claimedToday = user.last_daily_reward ? sameDay(user.last_daily_reward, new Date()) : false;
      const claimedTasks = new Set((history || []).filter((t) => t.type === 'task').map((t) => String(t.description || '').split(':')[0].replace('Task completed - ', '')));
      return res.status(200).json({
        balance: user.coins || 0,
        claimedToday,
        last_daily_reward: user.last_daily_reward,
        history: history || [],
        tasks: Object.entries(TASKS).map(([id, t]) => ({ id, ...t, claimed: claimedTasks.has(id) })),
      });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const { action, user_id } = b;
      if (!user_id) return res.status(401).json({ error: 'Login required.' });
      const { data: user } = await supabase.from('cm_users').select('*').eq('id', user_id).maybeSingle();
      if (!user) return res.status(401).json({ error: 'Login required.' });

      if (action === 'daily') {
        if (user.last_daily_reward && sameDay(user.last_daily_reward, new Date())) {
          return res.status(400).json({ error: 'Daily reward already claimed. Come back tomorrow!' });
        }
        const bal = (user.coins || 0) + 25;
        await supabase.from('cm_users').update({ coins: bal, last_daily_reward: new Date().toISOString() }).eq('id', user_id);
        await supabase.from('cm_transactions').insert({ user_id, type: 'reward', amount: 25, balance_after: bal, description: 'Daily reward +25' });
        return res.status(200).json({ ok: true, balance: bal, amount: 25 });
      }

      if (action === 'transfer') {
        const to_email = String(b.to_email || '').trim().toLowerCase();
        const amount = parseInt(b.amount);
        if (!to_email) return res.status(400).json({ error: 'Recipient email is required.' });
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Transfer amount must be positive.' });
        if (to_email === user.email) return res.status(400).json({ error: 'You cannot transfer coins to yourself.' });
        if ((user.coins || 0) < amount) return res.status(400).json({ error: `Insufficient coins. Balance: ${user.coins}.` });
        const { data: recipient } = await supabase.from('cm_users').select('*').eq('email', to_email).maybeSingle();
        if (!recipient) return res.status(404).json({ error: 'Recipient not found. Check the email.' });
        const fromBal = user.coins - amount;
        const toBal = (recipient.coins || 0) + amount;
        await supabase.from('cm_users').update({ coins: fromBal }).eq('id', user_id);
        await supabase.from('cm_users').update({ coins: toBal }).eq('id', recipient.id);
        await supabase.from('cm_transactions').insert([
          { user_id, type: 'transfer_out', amount: -amount, balance_after: fromBal, description: `Transfer to ${recipient.display_name} (${recipient.email})` },
          { user_id: recipient.id, type: 'transfer_in', amount, balance_after: toBal, description: `Transfer from ${user.display_name}` },
        ]);
        return res.status(200).json({ ok: true, balance: fromBal });
      }

      if (action === 'task') {
        const task_id = b.task_id;
        const task = TASKS[task_id];
        if (!task) return res.status(400).json({ error: 'Unknown task.' });
        const { data: prior } = await supabase.from('cm_transactions').select('id').eq('user_id', user_id).eq('type', 'task').like('description', `%${task_id}%`).limit(1);
        if (prior && prior.length) return res.status(400).json({ error: 'Task reward already claimed.' });
        if (task_id === 'wishlist3') {
          const { count } = await supabase.from('cm_wishlist').select('id', { count: 'exact', head: true }).eq('user_id', user_id);
          if ((count || 0) < 3) return res.status(400).json({ error: 'Save at least 3 items to your wishlist first.' });
        }
        if (task_id === 'first_purchase') {
          const { count } = await supabase.from('cm_orders').select('id', { count: 'exact', head: true }).eq('buyer_id', user_id);
          if ((count || 0) < 1) return res.status(400).json({ error: 'Complete a purchase first.' });
        }
        if (task_id === 'first_sale') {
          const { count } = await supabase.from('cm_orders').select('id', { count: 'exact', head: true }).eq('seller_id', user_id);
          if ((count || 0) < 1) return res.status(400).json({ error: 'Make a sale first.' });
        }
        if (task_id === 'first_bid') {
          const { count } = await supabase.from('cm_bids').select('id', { count: 'exact', head: true }).eq('bidder_id', user_id);
          if ((count || 0) < 1) return res.status(400).json({ error: 'Place a bid first.' });
        }
        const bal = (user.coins || 0) + task.reward;
        await supabase.from('cm_users').update({ coins: bal }).eq('id', user_id);
        await supabase.from('cm_transactions').insert({ user_id, type: 'task', amount: task.reward, balance_after: bal, description: `Task completed - ${task_id}: ${task.label}` });
        return res.status(200).json({ ok: true, balance: bal, amount: task.reward });
      }

      return res.status(400).json({ error: 'Unknown action.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('coins API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
