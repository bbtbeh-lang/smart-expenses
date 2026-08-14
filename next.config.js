/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Security headers applied to every response. Kept deliberately
  // conservative (no CSP) so nothing here can break Stripe Checkout
  // redirects, Supabase, self-hosted fonts, or the OCR camera input —
  // a strict CSP is a good follow-up but needs its own testing pass,
  // not something to ship untested right before launch.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevents the app being framed by another site (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops browsers from MIME-sniffing responses into an
          // executable type they weren't served as.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Sends the full referrer only to our own origin; other sites
          // get just the scheme+host, not the full URL/query string.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Camera stays available (self) for the receipt/invoice scan
          // feature; everything else the app doesn't use is locked off.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()' },
          // Forces HTTPS on repeat visits for a year, including
          // subdomains. Safe since Vercel serves this app over HTTPS only.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        // silence the node-fetch / encoding warning from tesseract.js node worker
        encoding: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
