'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'finsnap_state_v1';

// Next.js App Router automatically wraps every route segment in an error
// boundary defined by this file — without it (and this app had none),
// ANY uncaught render-time exception anywhere in the component tree
// (Dashboard, TransactionModal, ReportsTab, a corrupt localStorage
// snapshot, a malformed transaction from a stale sync, a null-pointer
// edge case in a chart) takes down the entire app to a blank screen with
// no recovery path and no explanation — a full outage from a single bad
// component, in an app that handles people's financial data.
//
// This can't use the `tr`/translations system the rest of the app uses —
// error boundaries render outside the normal provider tree and may fire
// specifically because that tree is broken — so language is read
// directly out of the same localStorage snapshot the rest of the app
// persists to, with a plain hardcoded fallback in each of the three
// languages if even that read fails.
const COPY = {
  EN: {
    title: 'Something went wrong',
    body: "FinSnap hit an unexpected error. Your data is safe — it's saved on this device and in your account. Try reloading the page.",
    reload: 'Reload FinSnap',
  },
  FR: {
    title: "Une erreur s'est produite",
    body: 'FinSnap a rencontré une erreur inattendue. Vos données sont en sécurité — elles sont enregistrées sur cet appareil et dans votre compte. Essayez de recharger la page.',
    reload: 'Recharger FinSnap',
  },
  FA: {
    title: 'مشکلی پیش آمد',
    body: 'فاین‌اسنپ با یک خطای غیرمنتظره مواجه شد. اطلاعات شما امن است — روی این دستگاه و در حساب شما ذخیره شده. لطفاً صفحه را دوباره بارگذاری کنید.',
    reload: 'بارگذاری مجدد فاین‌اسنپ',
  },
};

function detectLang(): 'EN' | 'FR' | 'FA' {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.lang === 'FR' || parsed?.lang === 'FA' || parsed?.lang === 'EN') return parsed.lang;
    }
  } catch {}
  return 'EN';
}

export default function GlobalErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [lang, setLang] = useState<'EN' | 'FR' | 'FA'>('EN');

  useEffect(() => {
    setLang(detectLang());
    // Logged for visibility in Vercel's function/runtime logs — this is
    // the only place an uncaught client-side render error surfaces at
    // all right now, since there's no error-tracking service wired up.
    console.error('[FinSnap] Uncaught render error:', error);
  }, [error]);

  const isRtl = lang === 'FA';
  const copy = COPY[lang];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-rose-500" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">{copy.title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{copy.body}</p>
        <button
          onClick={() => {
            // Try the soft React-level recovery first; if the error
            // recurs immediately, a full reload is the reliable fallback.
            reset();
            setTimeout(() => window.location.reload(), 50);
          }}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {copy.reload}
        </button>
      </div>
    </div>
  );
}
