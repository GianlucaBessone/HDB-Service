import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSafeServerConfig() {
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

export const createClient = async () => {
  const cookieStore = await cookies();
  const { url, key } = getSafeServerConfig();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                secure: process.env.NODE_ENV === 'production',
              })
            );
          } catch {
            // Ignored in Server Component
          }
        },
      },
    }
  );
};
