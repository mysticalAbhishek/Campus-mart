import supabase from './db-client.js';

export const strip = (u) => {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
};

const makeReferralCode = (name) => {
  const prefix = (name || 'CAMPUS').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase().padEnd(4, 'X');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing user id' });
      const { data, error } = await supabase.from('cm_users').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(strip(data));
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || 'login';

      if (action === 'signup') {
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        const role = String(body.role || 'buyer');
        const display_name = String(body.display_name || '').trim() || email.split('@')[0];
        const referralInput = String(body.referral_code || '').trim().toUpperCase();

        if (!email || !email.includes('@')) return res.status(400).json({ error: 'Please enter a valid email address.' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        if (!['buyer', 'seller'].includes(role)) return res.status(403).json({ error: 'Public signup is only allowed for Buyer or Seller roles.' });

        const { data: existing } = await supabase.from('cm_users').select('id').eq('email', email).maybeSingle();
        if (existing) return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });

        let referred_by = null;
        let referrer = null;
        if (referralInput) {
          const { data: ref } = await supabase.from('cm_users').select('*').eq('referral_code', referralInput).maybeSingle();
          if (ref) { referrer = ref; referred_by = ref.id; }
        }

        const { data: created, error: insErr } = await supabase.from('cm_users').insert({
          email, password, role, display_name,
          coins: 500,
          avatar_emoji: role === 'seller' ? '🧑‍💼' : '🧑‍🎓',
          bio: role === 'seller' ? 'Campus seller' : 'Campus student',
          referral_code: makeReferralCode(display_name),
          referred_by,
        }).select().single();
        if (insErr) throw insErr;

        await supabase.from('cm_transactions').insert({
          user_id: created.id, type: 'signup', amount: 500,
          balance_after: 500, description: 'Welcome bonus: 500 Campus Coins',
        });

        if (referrer) {
          const newBal = (referrer.coins || 0) + 50;
          await supabase.from('cm_users').update({ coins: newBal }).eq('id', referrer.id);
          await supabase.from('cm_transactions').insert({
            user_id: referrer.id, type: 'referral', amount: 50,
            balance_after: newBal, description: `Referral bonus for inviting ${display_name}`,
          });
        }

        return res.status(201).json(strip(created));
      }

      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
      const { data: user, error } = await supabase.from('cm_users').select('*').eq('email', email).maybeSingle();
      if (error) throw error;
      if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid email or password.' });
      return res.status(200).json(strip(user));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('auth API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
