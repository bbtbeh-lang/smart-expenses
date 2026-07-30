import type { MetadataRoute } from 'next';

// The app is a single-page client (app/page.tsx): logged-out visitors see
// the public sign-in/marketing screen, logged-in visitors see the app
// itself. Only the truly public, indexable routes belong here — the app
// experience isn't a separate crawlable URL.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://finsnap-2026.vercel.app';
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
