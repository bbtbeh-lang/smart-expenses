/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
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
