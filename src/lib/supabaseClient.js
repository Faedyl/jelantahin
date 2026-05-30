import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[supabaseClient] URL:', supabaseUrl);
console.log('[supabaseClient] KEY length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env — ' +
    'copy .env.example to .env and fill in your Supabase project details.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'placeholder-key'
);

/** Whether email OTP bypass is enabled for development */
export const DEV_BYPASS_EMAIL =
  import.meta.env.VITE_DEV_BYPASS_EMAIL === 'true';
