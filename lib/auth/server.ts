import { createNeonAuth } from '@neondatabase/auth/next/server';

const getBaseUrl = () => {
  if (process.env.NEON_AUTH_BASE_URL) return process.env.NEON_AUTH_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

export const auth = createNeonAuth({
  baseUrl: getBaseUrl(),
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

