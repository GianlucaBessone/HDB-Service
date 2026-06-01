const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline.html",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /\/api\/(?:tickets|dispensers|stock|plants|dashboard|notifications|maintenance).*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 3,
        },
      },
      {
        urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|webp|ico|json)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxEntries: 150,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@react-pdf/renderer'],
  turbopack: {},
};

module.exports = withPWA(nextConfig);
