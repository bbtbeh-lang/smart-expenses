import './globals.css';
import type { Metadata } from 'next';
// Self-hosted fonts via @fontsource, not next/font/google + a Google
// Fonts <link>. next/font/google still makes a build-time network
// request to fetch the font files even though it serves them from our
// own origin afterward — @fontsource ships the actual font files inside
// the npm package itself, so there's no network dependency on Google at
// build time OR runtime. (We hit this directly: a build in a
// network-restricted environment failed outright because it couldn't
// reach fonts.googleapis.com.)
import '@fontsource-variable/inter';
import '@fontsource/vazirmatn/300.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';

export const metadata: Metadata = {
  title: 'FinSnap — Smart Finance Management',
  description: 'AI-powered income, expense, and tax management for personal and business use.',
  themeColor: '#10b981',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Inter Variable', sans-serif" }}>{children}</body>
    </html>
  );
}
