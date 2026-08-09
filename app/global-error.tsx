'use client';

// app/error.tsx catches errors in every route segment EXCEPT the root
// layout itself (it renders inside that layout, so it can't catch a
// crash in the layout that's supposed to render it). This file is the
// one Next.js App Router mechanism that can — it replaces the entire
// <html>/<body>, so it's deliberately minimal, dependency-free, and
// doesn't attempt to read localStorage/translations the way
// app/error.tsx does, since a broken root layout is the one case where
// even that shouldn't be assumed to work.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 16 }}>
          <div style={{ maxWidth: 380, textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
              FinSnap failed to load. Your data is safe. Please try reloading the page.
            </p>
            <button
              onClick={() => { reset(); window.location.reload(); }}
              style={{ background: '#0f172a', color: 'white', fontWeight: 600, padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
            >
              Reload FinSnap
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
