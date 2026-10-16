import { createBrowserClient } from "@supabase/ssr";

export const isSupabaseConfigured = (): boolean => {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !rawKey) return false;
  if (rawUrl.includes('YOUR_PROJECT_ID') || rawUrl.includes('your-project-id') || rawUrl.includes('placeholder')) return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

function getSafeBrowserConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  let validUrl = 'https://placeholder.supabase.co';
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        validUrl = rawUrl;
      }
    } catch {
      // Malformed URL, use fallback
    }
  }

  const validKey = rawKey || 'placeholder-anon-key';
  return { url: validUrl, key: validKey };
}

export const createClient = () => {
  const { url, key } = getSafeBrowserConfig();
  return createBrowserClient(url, key);
};
