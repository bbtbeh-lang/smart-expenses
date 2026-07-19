// @refresh reset
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, Transaction, DraftTransaction, TransactionType, AccountType, Lang } from '@/lib/types';
import { t } from '@/lib/translations';
import Header from '@/components/Header';
import NavBar, { NavTab } from '@/components/NavBar';
import AuthScreen from '@/components/AuthScreen';
import OnboardingScreen from '@/components/OnboardingScreen';
import Dashboard from '@/components/Dashboard';
import TransactionsTab from '@/components/TransactionsTab';
import ReportsTab from '@/components/ReportsTab';
import SettingsTab from '@/components/SettingsTab';
import TransactionModal from '@/components/TransactionModal';
import AIReviewModal from '@/components/AIReviewModal';
import TaxReportModal from '@/components/TaxReportModal';
import UpgradeModal from '@/components/UpgradeModal';
import PlanModal from '@/components/PlanModal';
import BudgetModal from '@/components/BudgetModal';
import Toast, { ToastMessage } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { syncTransactions, upsertTransaction, deleteTransactionRemote } from '@/lib/transactionSync';

const STORAGE_KEY = 'finsnap_state_v1';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function freshState(lang: Lang = 'EN'): AppState {
  return {
    screen: 'auth',
    lang,
    accountType: null,
    tier: 'free',
    plan: 'free',
    billingPeriod: null,
    scansUsedThisPeriod: 0,
    scanLimit: 0,
    currentPeriodEnd: null,
    subscriptionLoaded: false,
    hasManualAccess: false,
    hasScanAccess: false,
    codeActivated: false,
    scansUsedToday: 0,
    maxDailyScans: 10,
    transactions: [],
    draftQueue: [],
    totalIncome: 0,
    totalExpenses: 0,
    budgets: {},
    customCategories: {},
  };
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...freshState(parsed.lang), ...parsed };
    }
  } catch {}
  return freshState();
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function Home() {
  const [state, setState] = useState<AppState>(freshState);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAIReview, setShowAIReview] = useState<DraftTransaction | null>(null);
  const [showTaxReport, setShowTaxReport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlanManager, setShowPlanManager] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Fetches the real subscription/plan status from Supabase (via our API,
  // which reads the `subscriptions` table written by the Stripe webhook).
  const refreshSubscription = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const sub = await res.json();
      setState(prev => ({
        ...prev,
        plan: sub.plan,
        billingPeriod: sub.billingPeriod,
        scansUsedThisPeriod: sub.scansUsed,
        scanLimit: sub.scanLimit,
        currentPeriodEnd: sub.currentPeriodEnd,
        subscriptionLoaded: true,
        tier: sub.plan === 'free' ? 'free' : 'premium',
        hasManualAccess: !!sub.hasManualAccess,
        hasScanAccess: !!sub.hasScanAccess,
      }));
    } catch {
      // Network error — leave existing state as-is, will retry on next auth event.
    }
  }, []);

  // Pulls this user's transactions down from Supabase (and, the first time
  // a device with pre-existing local data signs in, pushes those local
  // transactions up once so they aren't lost) — see lib/transactionSync.ts.
  const syncUserTransactions = useCallback(async (userId: string, localTx: Transaction[]) => {
    const merged = await syncTransactions(userId, localTx);
    setState(prev => ({ ...prev, transactions: merged }));
  }, []);

  // Always reflects the latest in-memory transactions, so a resync never
  // has to guess whether localStorage has caught up with the newest edit.
  const transactionsRef = useRef<Transaction[]>(state.transactions);
  useEffect(() => { transactionsRef.current = state.transactions; }, [state.transactions]);

  // Listen for Supabase auth changes (Google redirect, email verification, etc.)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && state.screen === 'auth') {
        const loaded = loadState();
        setState(prev => ({ ...loaded, screen: 'onboarding', lang: prev.lang }));
        refreshSubscription();
        syncUserTransactions(session.user.id, loaded.transactions);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const loaded = loadState();
        setState(prev => {
          if (prev.screen === 'auth') {
            return { ...loaded, screen: 'onboarding', lang: prev.lang };
          }
          return prev;
        });
        refreshSubscription();
        // Subscription status is always safe to overwrite from the server —
        // there's no "local edit" to lose there. Transactions are different:
        // only resync them on an actual sign-in, using whatever is live in
        // memory right now (not a localStorage snapshot) as the local side
        // of the merge, so a periodic TOKEN_REFRESHED event firing moments
        // after the user adds a transaction can never make it disappear.
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          syncUserTransactions(session.user.id, transactionsRef.current.length > 0 ? transactionsRef.current : loaded.transactions);
        }
      } else {
        setState(prev => ({ ...freshState(prev.lang), screen: 'auth' }));
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After returning from Stripe Checkout, re-fetch the subscription so the
  // new plan shows up immediately (the webhook usually beats the redirect,
  // but we retry briefly in case it hasn't landed yet).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    window.history.replaceState({}, '', window.location.pathname);

    if (checkout === 'success') {
      addToast(tr.upgradeSuccess, 'success');
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts += 1;
        await refreshSubscription();
        if (attempts >= 5) clearInterval(interval);
      }, 1500);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    setState(loadState());
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (state.screen !== 'auth') {
      saveState(state);
    }
  }, [state]);

  const tr = t[state.lang];

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleLang = (lang: Lang) => {
    setState(prev => ({ ...prev, lang }));
  };

  const handleLogin = (_email: string) => {
    // Real plan/scan/manual-access status is always fetched from the
    // server right after this (see the auth effect's refreshSubscription
    // call) — there is no client-side shortcut to premium access.
    setState(prev => ({ ...prev, screen: 'onboarding' }));
  };

  const handleLogout = () => {
    addToast(tr.signingOut, 'info');
    setTimeout(async () => {
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY);
      setState(freshState(state.lang));
      setActiveTab('dashboard');
    }, 1000);
  };

  // Deletes the account server-side (cascades to all of the user's data —
  // see /api/account/delete), then ends the session and returns to the
  // sign-in screen. There is no undo, which is why the confirmation lives
  // in SettingsTab before this ever gets called.
  const handleDeleteAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        addToast('Failed to delete account. Please try again.', 'error');
        return;
      }
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY);
      setState(freshState(state.lang));
      setActiveTab('dashboard');
    } catch {
      addToast('Failed to delete account. Please try again.', 'error');
    }
  };

  const handleSelectAccountType = (type: AccountType) => {
    setState(prev => ({ ...prev, accountType: type, screen: 'dashboard' }));
  };

  // Lets the user switch between Personal and Business later from Settings
  // — previously this was a one-time choice made only during onboarding,
  // with no way back.
  const handleChangeAccountType = (type: AccountType) => {
    setState(prev => ({ ...prev, accountType: type }));
    addToast(tr.settingsAccountType + ': ' + (type === 'business' ? tr.business : tr.personal), 'success');
  };

  // Redeems today's code server-side. The server is the only place that can
  // check "is this code still valid / under its cap / not already used by
  // this user" and write the result — see /api/code/apply and the
  // redeem_daily_code() database function for why this can't be done safely
  // from the browser.
  const handleApplyCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { success: false, message: 'not_authenticated' };
    try {
      const res = await fetch('/api/code/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshSubscription();
      }
      return { success: !!data.success, message: data.message || 'server_error' };
    } catch {
      return { success: false, message: 'server_error' };
    }
  };

  const handleSaveManual = (tx: Transaction) => {
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, tx],
      totalIncome: tx.type === 'income' ? prev.totalIncome + tx.amount : prev.totalIncome,
      totalExpenses: tx.type === 'expense' ? prev.totalExpenses + tx.amount : prev.totalExpenses,
    }));
    setShowTransactionModal(false);
    addToast(`${tx.type === 'income' ? '💰' : '💸'} Transaction saved!`, 'success');
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) upsertTransaction(tx, user.id);
    });
  };

  const handleUpdateTransaction = (tx: Transaction) => {
    setState(prev => {
      const old = prev.transactions.find(t => t.id === tx.id);
      const oldIncome = old?.type === 'income' ? old.amount : 0;
      const oldExpense = old?.type === 'expense' ? old.amount : 0;
      return {
        ...prev,
        transactions: prev.transactions.map(t => t.id === tx.id ? tx : t),
        totalIncome: prev.totalIncome - oldIncome + (tx.type === 'income' ? tx.amount : 0),
        totalExpenses: prev.totalExpenses - oldExpense + (tx.type === 'expense' ? tx.amount : 0),
      };
    });
    setEditingTransaction(null);
    addToast('Transaction updated!', 'success');
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) upsertTransaction(tx, user.id);
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
        totalIncome: tx?.type === 'income' ? prev.totalIncome - tx.amount : prev.totalIncome,
        totalExpenses: tx?.type === 'expense' ? prev.totalExpenses - tx.amount : prev.totalExpenses,
      };
    });
    setEditingTransaction(null);
    addToast('Transaction deleted.', 'info');
    deleteTransactionRemote(id);
  };

  const handleStartReceiptUpload = (type: TransactionType) => {
    const draftId = generateId();
    const draft: DraftTransaction = {
      id: draftId,
      type,
      status: 'processing',
      createdAt: Date.now(),
    };

    setState(prev => ({
      ...prev,
      scansUsedToday: prev.tier === 'free' ? prev.scansUsedToday + 1 : prev.scansUsedToday,
      draftQueue: [...prev.draftQueue, draft],
    }));
    setShowTransactionModal(false);
    addToast('Receipt uploaded! AI is analyzing...', 'info');

    setTimeout(() => {
      setState(prev => ({
        ...prev,
        draftQueue: prev.draftQueue.map(d => d.id === draftId ? { ...d, status: 'ready' as const } : d),
      }));
      addToast('Receipt analysis complete! Tap to review.', 'success');
    }, 3000);
  };

  const handleConfirmAIReview = (tx: Transaction) => {
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, tx],
      totalIncome: tx.type === 'income' ? prev.totalIncome + tx.amount : prev.totalIncome,
      totalExpenses: tx.type === 'expense' ? prev.totalExpenses + tx.amount : prev.totalExpenses,
      draftQueue: prev.draftQueue.filter(d => d.id !== showAIReview?.id),
    }));
    setShowAIReview(null);
    addToast(`${tr.confirmSave}! Transaction added.`, 'success');
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) upsertTransaction(tx, user.id);
    });
  };

  // Redirects to Stripe Checkout for the chosen plan/billing period.
  const handleStartCheckout = async (plan: 'basic' | 'pro' | 'business', billingPeriod: 'monthly' | 'yearly') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      addToast(tr.signingOut, 'error');
      return;
    }
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan, billingPeriod }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast(data.error || 'Checkout failed', 'error');
      }
    } catch {
      addToast('Checkout failed', 'error');
    }
  };

  // Opens the Stripe Customer Portal so an already-subscribed user can
  // upgrade, downgrade, change billing period, or cancel — Stripe handles
  // all of that natively, so we don't need to build it ourselves.
  const handleManageSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast(data.error || 'Could not open subscription management', 'error');
      }
    } catch {
      addToast('Could not open subscription management', 'error');
    }
  };

  const handleSaveBudgets = (budgets: Record<string, number>, customCategories: Record<string, string>) => {
    setState(prev => ({ ...prev, budgets, customCategories }));
    setShowBudget(false);
    addToast(tr.saveBudgets, 'success');
  };

  const handleAddCustomCategory = (key: string, label: string) => {
    setState(prev => ({ ...prev, customCategories: { ...prev.customCategories, [key]: label } }));
  };

  const isRtl = state.lang === 'FA';
  const isLoggedIn = state.screen !== 'auth';

  const transactionModalProps = {
    tr,
    accountType: state.accountType || 'personal' as const,
    tier: state.tier,
    hasManualAccess: state.hasManualAccess,
    hasScanAccess: state.hasScanAccess,
    scansUsedToday: state.scansUsedThisPeriod,
    maxDailyScans: state.scanLimit,
    customCategories: state.customCategories,
    onAddCustomCategory: handleAddCustomCategory,
    onStartReceiptUpload: handleStartReceiptUpload,
    onScanConsumed: (scansUsed: number) => setState(prev => ({ ...prev, scansUsedThisPeriod: scansUsed })),
    onOpenUpgrade: () => { setShowTransactionModal(false); setEditingTransaction(null); setShowUpgrade(true); },
    onScanBlocked: () => addToast(tr.scanLimitReached || 'You have reached your monthly scan limit for this plan.', 'error'),
  };

  return (
    <div
      className="min-h-screen bg-slate-50"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={isRtl ? { fontFamily: "'Vazirmatn', sans-serif" } : undefined}
    >
      <Header
        lang={state.lang}
        tr={tr}
        onLangToggle={toggleLang}
        onLogout={handleLogout}
        isLoggedIn={isLoggedIn}
      />

      <main>
        {state.screen === 'auth' && (
          <AuthScreen tr={tr} onLogin={handleLogin} />
        )}

        {state.screen === 'onboarding' && (
          <OnboardingScreen tr={tr} onSelect={handleSelectAccountType} />
        )}

        {state.screen === 'dashboard' && (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                state={state}
                tr={tr}
                onAddTransaction={() => setShowTransactionModal(true)}
                onOpenUpgrade={() => setShowUpgrade(true)}
                onOpenTaxReport={() => setShowTaxReport(true)}
                onOpenAIReview={draft => setShowAIReview(draft)}
                onApplyCode={handleApplyCode}
                onOpenPlanManager={() => setShowPlanManager(true)}
                onOpenBudget={() => setShowBudget(true)}
                onDemoReset={() => setState(prev => ({ ...prev, codeActivated: false, hasManualAccess: false, hasScanAccess: false, scansUsedToday: 0, tier: 'free' }))}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsTab
                transactions={state.transactions}
                tr={tr}
                lang={state.lang}
                onEdit={tx => setEditingTransaction(tx)}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsTab
                transactions={state.transactions}
                lang={state.lang}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                state={state}
                tr={tr}
                onLogout={handleLogout}
                onOpenUpgrade={() => setShowUpgrade(true)}
                onOpenPlanManager={() => setShowPlanManager(true)}
                onLangToggle={toggleLang}
                onDeleteAccount={handleDeleteAccount}
                onChangeAccountType={handleChangeAccountType}
              />
            )}
          </>
        )}
      </main>

      {state.screen === 'dashboard' && (
        <NavBar activeTab={activeTab} onTabChange={setActiveTab} tr={tr} />
      )}

      {state.screen === 'dashboard' && activeTab === 'dashboard' && (
        <div className="fixed bottom-20 left-4 right-4 z-30 max-w-sm mx-auto">
          <button
            onClick={() => setShowTransactionModal(true)}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl text-sm shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {tr.addTransaction}
          </button>
        </div>
      )}

      {state.screen === 'dashboard' && activeTab === 'transactions' && (
        <div className="fixed bottom-20 right-4 z-30">
          <button
            onClick={() => setShowTransactionModal(true)}
            className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 active:scale-[0.95] transition-all duration-150 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      {showTransactionModal && (
        <TransactionModal
          {...transactionModalProps}
          onClose={() => setShowTransactionModal(false)}
          onSaveManual={handleSaveManual}
        />
      )}

      {editingTransaction && (
        <TransactionModal
          {...transactionModalProps}
          editTransaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaveManual={handleSaveManual}
          onUpdate={handleUpdateTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}

      {showAIReview && (
        <AIReviewModal
          tr={tr}
          draftId={showAIReview.id}
          transactionType={showAIReview.type}
          accountType={state.accountType || 'personal'}
          lang={state.lang}
          onConfirm={handleConfirmAIReview}
          onClose={() => setShowAIReview(null)}
        />
      )}

      {showTaxReport && (
        <TaxReportModal
          tr={tr}
          tier={state.tier}
          lang={state.lang}
          transactions={state.transactions}
          onClose={() => setShowTaxReport(false)}
          onOpenUpgrade={() => { setShowTaxReport(false); setShowUpgrade(true); }}
        />
      )}

      {showUpgrade && (
        <UpgradeModal
          tr={tr}
          currentPlan={state.plan}
          onClose={() => setShowUpgrade(false)}
          onSelectPlan={handleStartCheckout}
        />
      )}

      {showPlanManager && (
        <PlanModal
          tr={tr}
          plan={state.plan}
          billingPeriod={state.billingPeriod}
          currentPeriodEnd={state.currentPeriodEnd}
          onClose={() => setShowPlanManager(false)}
          onManageSubscription={handleManageSubscription}
        />
      )}

      {showBudget && (
        <BudgetModal
          tr={tr}
          accountType={state.accountType || 'personal'}
          lang={state.lang}
          budgets={state.budgets}
          customCategories={state.customCategories}
          onSave={handleSaveBudgets}
          onClose={() => setShowBudget(false)}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
