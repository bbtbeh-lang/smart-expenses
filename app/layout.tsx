import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinSnap — Smart Finance Management',
  description: 'AI-powered income, expense, and tax management for personal and business use.',
};

// Next.js 14 split themeColor out of the `metadata` export into its own
// `viewport` export (metadata.themeColor still "works" but logs a build
// warning on every route and is slated for removal) — see
// https://nextjs.org/docs/app/api-reference/functions/generate-viewport
export const viewport: Viewport = {
  themeColor: '#10b981',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
