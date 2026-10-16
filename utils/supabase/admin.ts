import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isValidSupabaseConfig(url: string, key: string) {
  if (!url || !key) return false;
  if (url.includes('YOUR_PROJECT_ID') || url.includes('your-project-id') || url.includes('placeholder')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Supabase client with service_role key for administrative operations.
 * USE ONLY ON THE SERVER.
 * Gracefully returns null if configuration is missing or placeholder.
 */
export const supabaseAdmin = isValidSupabaseConfig(rawUrl, supabaseServiceKey) 
  ? createClient(rawUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : (null as any);
