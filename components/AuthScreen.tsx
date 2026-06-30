'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { supabase } from '@/lib/supabase';

interface AuthScreenProps {
  tr: Translations;
  onLogin: (email: string) => void;
}

type Mode = 'signin' | 'signup' | 'forgot' | 'check_email' | 'reset_sent';

function getErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (message.includes('Email not confirmed')) return 'Please verify your email before signing in.';
  if (message.includes('User already registered')) return 'An account with this email already exists.';
  if (message.includes('Password should be at least')) return 'Password must be at least 6 characters.';
  return message || 'Something went wrong. Please try again.';
}

export default function AuthScreen({ tr, onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (m: Mode) => { setError(''); setMode(m); };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) { setError(getErrorMessage(err.message)); return; }
    if (data.user) onLogin(data.user.email || email);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    setLoading(false);
    if (err) { setError(getErrorMessage(err.message)); return; }
    setMode('check_email');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    setLoading(false);
    if (err) { setError(getErrorMessage(err.message)); return; }
    setMode('reset_sent');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (err) { setLoading(false); setError(getErrorMessage(err.message)); }
  };

  if (mode === 'check_email') return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Check your email</h1>
        <p className="text-sm text-slate-500 mb-1">We sent a verification link to</p>
        <p className="text-sm font-semibold text-slate-800 mb-6" dir="ltr">{email}</p>
        <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 mb-5">
          Click the link in the email to activate your account, then come back here to sign in.
        </p>
        <button onClick={() => switchMode('signin')} className="flex items-center justify-center gap-1.5 mx-auto text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </button>
      </div>
    </div>
  );

  if (mode === 'reset_sent') return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Reset link sent</h1>
        <p className="text-sm text-slate-500 mb-1">Check <span className="font-semibold text-slate-800" dir="ltr">{email}</span> for a password reset link.</p>
        <button onClick={() => switchMode('signin')} className="flex items-center justify-center gap-1.5 mx-auto mt-5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </button>
      </div>
    </div>
  );

  if (mode === 'forgot') return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <button onClick={() => switchMode('signin')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
          <p className="text-sm text-slate-500 mt-1">We will email you a reset link.</p>
        </div>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{tr.emailAddress}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                placeholder="you@example.com" dir="ltr" required />
            </div>
          </div>
          {error && <div className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">{error}</div>}
          <button type="submit" disabled={loading || !email}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  );

  const isSignUp = mode === 'signup';

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{isSignUp ? 'Create your account' : tr.welcomeBack}</h1>
          <p className="text-sm text-slate-500 mt-1">{isSignUp ? 'Start tracking in under a minute' : tr.signInSubtitle}</p>
        </div>

        <button type="button" onClick={handleGoogleSignIn} disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{tr.emailAddress}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                placeholder="you@example.com" dir="ltr" required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{tr.password}</label>
              {!isSignUp && (
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                placeholder="••••••••" minLength={6} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSignUp && <p className="text-[11px] text-slate-400 mt-1.5 ml-1">At least 6 characters</p>}
          </div>

          {error && <div className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">{error}</div>}

          <button type="submit" disabled={loading || !email || !password}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                {isSignUp ? 'Creating...' : 'Signing in...'}
              </span>
            ) : isSignUp ? 'Create account' : tr.signIn}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => switchMode(isSignUp ? 'signin' : 'signup')} className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            {isSignUp ? tr.signIn : 'Sign up free'}
          </button>
        </p>
      </div>
    </div>
  );
}
