import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing here is meant for search results: API routes, and the
      // admin panel shouldn't be crawled or indexed.
      disallow: ['/api/', '/admin'],
    },
    sitemap: 'https://finsnap.pixflow.one/sitemap.xml',
  };
}
