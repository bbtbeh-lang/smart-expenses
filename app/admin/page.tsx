'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, RefreshCw, Copy, Check, Lock } from 'lucide-react';

interface CodeStatus {
  code: string | null;
  uses: number;
  maxUses: number;
  validDate: string;
}

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [status, setStatus] = useState<CodeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadStatus = useCallback(async () => {
    setError('');
    const token = await getToken();
    if (!token) { setForbidden(true); setAuthChecked(true); return; }
    const res = await fetch('/api/admin/code/status', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      setAuthChecked(true);
      return;
    }
    const data = await res.json();
    setStatus(data);
    setForbidden(false);
    setAuthChecked(true);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) { setForbidden(true); return; }
      const res = await fetch('/api/admin/code/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) { setForbidden(true); return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate code'); return; }
      setStatus({ code: data.code, uses: 0, maxUses: data.maxUses, validDate: data.validDate });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!status?.code) return;
    navigator.clipboard.writeText(status.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full bg-white border border-slate-100 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-rose-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Access Denied</h1>
          <p className="text-sm text-slate-500">This page is restricted to admin accounts only.</p>
        </div>
      </div>
    );
  }

  const usagePercent = status?.maxUses ? Math.min(100, (status.uses / status.maxUses) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Daily Code Admin</h1>
            <p className="text-xs text-slate-400">Manual-entry access code — never grants scanning</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Today's code ({status?.validDate})
          </div>

          {status?.code ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-lg font-bold text-slate-900 tracking-wider text-center" dir="ltr">
                  {status.code}
                </div>
                <button
                  onClick={handleCopy}
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">Usage today</span>
                <span className="font-semibold text-slate-700" dir="ltr">{status.uses} / {status.maxUses}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePercent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">No code generated for today yet.</p>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl px-3 py-2 mb-4">{error}</div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {status?.code ? 'Generate a new code (replaces today\'s)' : "Generate today's code"}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
          This code unlocks <b>manual transaction entry only</b> for whoever redeems it today.
          It never grants OCR/receipt scanning — that's exclusive to paid plans.
        </p>
      </div>
    </div>
  );
}
