import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinSnap — Smart Finance Management',
    short_name: 'FinSnap',
    description: 'AI-powered income, expense, and tax management for personal and business use.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#10b981',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
