import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ [Supabase]: SUPABASE_URL or SUPABASE_ANON_KEY is not defined in environment variables.');
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [Supabase]: Supabase client initialized.');
    return supabaseClient;
  } catch (error) {
    console.error('❌ [Supabase]: Client initialization error:', error);
    return null;
  }
};
