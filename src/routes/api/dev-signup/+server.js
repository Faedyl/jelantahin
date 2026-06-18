import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  if (!dev) {
    return json({ error: 'Not available in production' }, { status: 403 });
  }

  // Use import.meta.env for VITE_ prefixed vars (available in Vite-processed code)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json({
      error: 'Missing env vars',
      missingUrl: !supabaseUrl,
      missingKey: !serviceRoleKey
    }, { status: 500 });
  }

  try {
    const { email, password, role, full_name, phone, address, umkm_name, company_name } = await request.json();

    if (!email || !password || !role || !full_name) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name, phone, address, umkm_name, company_name }
    });

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }

    return json({ user: data.user }, { status: 200 });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
}