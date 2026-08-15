'use client';

import { useState } from 'react';
import { Translations } from '@/lib/translations';
import { supabase } from '@/lib/supabase';

interface AuthScreenProps {
  tr: Translations;
  onLogin: (email: string) => void;
}

function getErrorMessage(message: string, tr: Translations): string {
  return message || tr.authGenericError;
}

export default function AuthScreen({ tr }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 'options': Google button + "continue with email" link (default view)
  // 'email': the email input + send-link form
  // 'sent': confirmation screen after the magic link has gone out
  const [mode, setMode] = useState<'options' | 'email' | 'sent'>('options');
  const [email, setEmail] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (err) { setLoading(false); setError(getErrorMessage(err.message, tr)); }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    // Deliberately simple check, not a full RFC 5322 validator — this is
    // just to catch obvious typos before hitting the network; Supabase
    // still validates and dedupes server-side regardless.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(tr.invalidEmailError);
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        // No shouldCreateUser: false here — first-time email sign-in
        // should create the account, same as first-time Google sign-in
        // does implicitly. Onboarding still runs afterward either way.
      },
    });
    setLoading(false);
    if (err) { setError(getErrorMessage(err.message, tr)); return; }
    setMode('sent');
  };

  const resetToOptions = () => {
    setMode('options');
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === 'sent' ? tr.magicLinkSentTitle : tr.welcomeBack}
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-7">
          {mode === 'sent'
            ? tr.magicLinkSentSubtitle.replace('{email}', email.trim())
            : tr.signInSubtitle}
        </p>

        {mode === 'sent' ? (
          <button
            type="button"
            onClick={resetToOptions}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            {tr.backToSignInOptions}
          </button>
        ) : mode === 'email' ? (
          <form onSubmit={handleSendMagicLink} className="space-y-3 text-left rtl:text-right">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tr.emailPlaceholder}
              aria-label={tr.emailAddress}
              className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              {loading ? tr.sendingLink : tr.sendMagicLink}
            </button>
            <button
              type="button"
              onClick={resetToOptions}
              className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 pt-1"
            >
              {tr.backToSignInOptions}
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {loading ? tr.signingIn : tr.continueWithGoogle}
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">{tr.orDivider}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => { setMode('email'); setError(''); }}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-all active:scale-[0.98]"
            >
              {tr.continueWithEmail}
            </button>
          </>
        )}

        {error && (
          <div role="alert" className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 mt-4">{error}</div>
        )}

        <p className="text-xs text-slate-400 mt-6 leading-relaxed">
          {(() => {
            // authTermsAgreement has {terms} and {privacy} placeholders so
            // the two legal links can be real <a> tags (clickable, with
            // proper href/target) rather than baked into a plain string —
            // splitting on the placeholders keeps the surrounding sentence
            // fully translatable per language.
            const [before, rest] = tr.authTermsAgreement.split('{terms}');
            const [between, after] = rest.split('{privacy}');
            return (
              <>
                {before}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">{tr.termsLinkLabel}</a>
                {between}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">{tr.privacyLinkLabel}</a>
                {after}
              </>
            );
          })()}
        </p>
      </div>
    </div>
  );
}
