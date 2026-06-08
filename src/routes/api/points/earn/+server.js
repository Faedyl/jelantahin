import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * POST /api/points/earn
 *
 * Server-side points earning — uses service_role to bypass RLS.
 * Called when Perusahaan completes an order or confirms payment.
 *
 * Body: { user_id, points, source, description, transaction_id? }
 */
export async function POST({ request }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server not configured (missing SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
  }

  try {
    const { user_id, points, source, description, transaction_id } = await request.json();

    if (!user_id || !points || points <= 0) {
      return json({ error: 'user_id dan points wajib diisi' }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Insert earning log
    const { error: earnError } = await adminClient
      .from('point_earnings')
      .insert([{
        user_id,
        transaction_id: transaction_id || null,
        points,
        source: source || 'transaction',
        description: description || null,
      }]);

    if (earnError) {
      console.error('[Points] Earn log error:', earnError);
      return json({ error: earnError.message }, { status: 500 });
    }

    // 2. Upsert credit_coupons (atomic)
    const { error: upsertError } = await adminClient.rpc('increment_points', {
      p_user_id: user_id,
      p_points: points,
    });

    if (upsertError) {
      // Fallback: manual upsert
      console.warn('[Points] RPC fallback:', upsertError.message);
      const { data: current } = await adminClient
        .from('credit_coupons')
        .select('balance, lifetime_earned')
        .eq('user_id', user_id)
        .maybeSingle();

      if (current) {
        await adminClient
          .from('credit_coupons')
          .update({
            balance: (current.balance || 0) + points,
            lifetime_earned: (current.lifetime_earned || 0) + points,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user_id);
      } else {
        await adminClient
          .from('credit_coupons')
          .insert([{ user_id, balance: points, lifetime_earned: points }]);
      }
    }

    return json({ success: true, points });
  } catch (err) {
    console.error('[Points] Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}
