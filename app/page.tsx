// @refresh reset
'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Zap } from 'lucide-react';
import { AppState, AppScreen, Transaction, TransactionType, AccountType, Lang } from '@/lib/types';
import { t } from '@/lib/translations';
import Header from '@/components/Header';
import NavBar, { NavTab } from '@/components/NavBar';
import AuthScreen from '@/components/AuthScreen';
import OnboardingScreen from '@/components/OnboardingScreen';
import Dashboard from '@/components/Dashboard';
import TransactionsTab from '@/components/TransactionsTab';
import ReportsTab from '@/components/ReportsTab';
import PricingTab from '@/components/PricingTab';
import SettingsTab from '@/components/SettingsTab';
import TransactionModal from '@/components/TransactionModal';
import TaxReportModal from '@/components/TaxReportModal';
import UpgradeModal from '@/components/UpgradeModal';
import PlanModal from '@/components/PlanModal';
import BudgetModal from '@/components/BudgetModal';
import Toast, { ToastMessage } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { todayLocalDate } from '@/lib/utils';
import { syncTransactions, upsertTransaction, deleteTransactionRemote, markTransactionDeletedLocally, getRecentlyDeletedIds } from '@/lib/transactionSync';

const STORAGE_KEY = 'finsnap_state_v1';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// A brand-new session starts in 'loading', not 'auth' — this avoids a
// flash of the sign-in screen for a user who actually has a valid
// session and is about to land on their dashboard a moment later. Every
// place that used to gate on `screen === 'auth'` to mean "not logged in
// yet" now goes through isPreAuthScreen() so 'loading' is treated the
// same way (no premature save/sync while we don't know who's signed in).
function isPreAuthScreen(screen: AppScreen): boolean {
  return screen === 'loading' || screen === 'auth';
}

function freshState(lang: Lang = 'EN'): AppState {
  return {
    screen: 'loading',
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
    totalIncome: 0,
    totalExpenses: 0,
    budgets: {},
    customCategories: {},
    customIncomeCategories: {},
    budgetDueDates: {},
    budgetReminders: {},
    budgetPeriods: {},
    budgetTerms: {},
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
  const [showQuickScan, setShowQuickScan] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showTaxReport, setShowTaxReport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Marketing / flyer QR codes point at ?upgrade=1 (see the QR code sent to
  // the person). Once the user reaches the dashboard — whether they just
  // signed up or were already logged in — pop the plan-picker straight
  // away instead of making them go hunt for it, then strip the param so
  // it doesn't reopen on every refresh/navigation.
  const upgradeIntentHandled = useRef(false);
  useEffect(() => {
    if (state.screen !== 'dashboard' || upgradeIntentHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === '1') {
      upgradeIntentHandled.current = true;
      setShowUpgrade(true);
      params.delete('upgrade');
      const rest = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
    }
  }, [state.screen]);
  const [showPlanManager, setShowPlanManager] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Fetches the real subscription/plan status from Supabase (via our API,
  // which reads the `subscriptions` table written by the Stripe webhook).
  const refreshSubscription = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      const res = await fetch(`/api/subscription?date=${encodeURIComponent(todayLocalDate())}`, {
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
    const merged = await syncTransactions(userId, localTx, getRecentlyDeletedIds());
    setState(prev => ({ ...prev, transactions: merged }));
  }, []);

  // Custom category labels (key -> user-typed name) used to live only in
  // localStorage, which sign-out wipes — after signing back in, transactions
  // still referenced the right key but nothing could translate it back to
  // a label, so the raw key (e.g. "custom_suger_1784775632372") showed up
  // in the UI. Now the mapping is persisted server-side (user_profiles),
  // fetched on sign-in, and merged with whatever's live in memory so a
  // category minted seconds ago (not yet pushed) is never lost either way.
  // Shared by both expense (customCategories) and income
  // (customIncomeCategories) custom category maps — same bug, same fix,
  // just a different state field and API field name.
  const syncUserCustomCategoryMap = useCallback(async (
    userId: string,
    field: 'customCategories' | 'customIncomeCategories',
    localMap: Record<string, string>
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const serverMap = (data[field] ?? {}) as Record<string, string>;
      const merged = { ...serverMap, ...localMap };
      setState(prev => ({ ...prev, [field]: merged }));
      // Push back so any locally-minted-but-unsynced categories reach the
      // server too. The PATCH endpoint authoritatively replaces (not
      // merges) — safe here because `merged` above already folded in
      // whatever the server had before we overwrite it.
      if (Object.keys(merged).length > 0) {
        await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ [field]: merged }),
        });
      }
    } catch {
      // Network error — keep whatever's already in local state; next
      // sign-in (or the next edit, via the save effect below) will retry.
    }
  }, []);

  // Same idea as syncUserCustomCategoryMap above, but for budgets/
  // budgetDueDates/budgetReminders together (see the migration this
  // pairs with — these three were never synced to the server at all
  // before, so signing out silently erased them since localStorage is
  // cleared on logout).
  const syncUserBudgetData = useCallback(async (
    localBudgets: Record<string, number>,
    localDueDates: AppState['budgetDueDates'],
    localReminders: Record<string, boolean>,
    localPeriods: AppState['budgetPeriods'],
    localTerms: AppState['budgetTerms']
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const server = (data.budgetData ?? {}) as {
        budgets?: Record<string, number>;
        budgetDueDates?: AppState['budgetDueDates'];
        budgetReminders?: Record<string, boolean>;
        budgetPeriods?: AppState['budgetPeriods'];
        budgetTerms?: AppState['budgetTerms'];
      };
      const merged = {
        budgets: { ...(server.budgets ?? {}), ...localBudgets },
        budgetDueDates: { ...(server.budgetDueDates ?? {}), ...localDueDates },
        budgetReminders: { ...(server.budgetReminders ?? {}), ...localReminders },
        budgetPeriods: { ...(server.budgetPeriods ?? {}), ...localPeriods },
        budgetTerms: { ...(server.budgetTerms ?? {}), ...localTerms },
      };
      setState(prev => ({ ...prev, ...merged }));
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ budgetData: merged }),
      });
    } catch {
      // Network error — keep whatever's already in local state; next
      // sign-in (or the debounced save effect below) will retry.
    }
  }, []);

  // Always reflects the latest in-memory transactions, so a resync never
  // has to guess whether localStorage has caught up with the newest edit.
  const transactionsRef = useRef<Transaction[]>(state.transactions);
  useEffect(() => { transactionsRef.current = state.transactions; }, [state.transactions]);

  const customCategoriesRef = useRef<Record<string, string>>(state.customCategories);
  useEffect(() => { customCategoriesRef.current = state.customCategories; }, [state.customCategories]);

  const customIncomeCategoriesRef = useRef<Record<string, string>>(state.customIncomeCategories);
  useEffect(() => { customIncomeCategoriesRef.current = state.customIncomeCategories; }, [state.customIncomeCategories]);

  const budgetsRef = useRef<Record<string, number>>(state.budgets);
  useEffect(() => { budgetsRef.current = state.budgets; }, [state.budgets]);
  const budgetDueDatesRef = useRef<AppState['budgetDueDates']>(state.budgetDueDates);
  useEffect(() => { budgetDueDatesRef.current = state.budgetDueDates; }, [state.budgetDueDates]);
  const budgetRemindersRef = useRef<Record<string, boolean>>(state.budgetReminders);
  useEffect(() => { budgetRemindersRef.current = state.budgetReminders; }, [state.budgetReminders]);
  const budgetPeriodsRef = useRef<AppState['budgetPeriods']>(state.budgetPeriods);
  useEffect(() => { budgetPeriodsRef.current = state.budgetPeriods; }, [state.budgetPeriods]);
  const budgetTermsRef = useRef<AppState['budgetTerms']>(state.budgetTerms);
  useEffect(() => { budgetTermsRef.current = state.budgetTerms; }, [state.budgetTerms]);

  // Listen for Supabase auth changes (Google redirect, email verification, etc.)
  useEffect(() => {
    // BUG FIX: this file used to also call supabase.auth.getSession().then(...)
    // here, running its own near-duplicate of everything below. The two
    // raced on every sign-in, and whichever resolved LAST won — usually
    // onAuthStateChange, per the removed code's own comment, but not
    // always. When getSession() won the race right after a sign-out (when
    // localStorage had just been cleared), it would setState(prev =>
    // ({ ...loaded, ... })) with an EMPTY `loaded` object, wiping out
    // whatever onAuthStateChange had just correctly merged in from the
    // server a moment earlier — budgets, transactions, everything. That's
    // exactly why a saved budget could vanish after a sign-out/sign-in
    // cycle. onAuthStateChange already fires an 'INITIAL_SESSION' event
    // with the current session immediately on subscribing below, so it
    // covers the getSession() case on its own — and does it more safely
    // (refs for "what's live in memory right now" instead of only
    // localStorage, plus a functional setState that checks fresh
    // prev.screen instead of a stale closured value). Removing the
    // redundant call removes the race entirely instead of just hoping
    // the "right" one wins.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const loaded = loadState();
        setState(prev => {
          if (isPreAuthScreen(prev.screen)) {
            // BUG FIX: this used to always send a returning sign-in to
            // 'onboarding', forcing every user to re-pick Personal/Business
            // on every single app load even though they'd already chosen
            // one and it was sitting right there in loaded.accountType. Go
            // straight to the dashboard when we already know the account
            // type; only show onboarding for an actual first-time choice.
            return { ...loaded, screen: loaded.accountType ? 'dashboard' : 'onboarding', lang: prev.lang };
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
          const localCats = Object.keys(customCategoriesRef.current).length > 0 ? customCategoriesRef.current : loaded.customCategories;
          syncUserCustomCategoryMap(session.user.id, 'customCategories', localCats);
          const localIncomeCats = Object.keys(customIncomeCategoriesRef.current).length > 0 ? customIncomeCategoriesRef.current : loaded.customIncomeCategories;
          syncUserCustomCategoryMap(session.user.id, 'customIncomeCategories', localIncomeCats);
          const localBudgets = Object.keys(budgetsRef.current).length > 0 ? budgetsRef.current : loaded.budgets;
          const localDueDates = Object.keys(budgetDueDatesRef.current).length > 0 ? budgetDueDatesRef.current : loaded.budgetDueDates;
          const localReminders = Object.keys(budgetRemindersRef.current).length > 0 ? budgetRemindersRef.current : loaded.budgetReminders;
          const localPeriods = Object.keys(budgetPeriodsRef.current).length > 0 ? budgetPeriodsRef.current : loaded.budgetPeriods;
          const localTerms = Object.keys(budgetTermsRef.current).length > 0 ? budgetTermsRef.current : loaded.budgetTerms;
          syncUserBudgetData(localBudgets, localDueDates, localReminders, localPeriods, localTerms);
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
    if (!isPreAuthScreen(state.screen)) {
      saveState(state);
    }
  }, [state]);

  // Also persist custom category labels to Supabase whenever they change
  // (debounced) so a category minted mid-session survives even if the
  // sign-out happens before the next sign-in resync would have caught it.
  // The PATCH endpoint merges server-side, so this can't clobber labels
  // another device added since our last fetch.
  const customCategoriesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isPreAuthScreen(state.screen) || Object.keys(state.customCategories).length === 0) return;
    if (customCategoriesSaveTimer.current) clearTimeout(customCategoriesSaveTimer.current);
    customCategoriesSaveTimer.current = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ customCategories: state.customCategories }),
      }).catch(() => {
        // Best-effort — the next sign-in's syncUserCustomCategories call
        // will retry with whatever's in memory or localStorage by then.
      });
    }, 800);
    return () => {
      if (customCategoriesSaveTimer.current) clearTimeout(customCategoriesSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.customCategories, state.screen]);

  // Same debounced persistence, for custom income category labels.
  const customIncomeCategoriesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isPreAuthScreen(state.screen) || Object.keys(state.customIncomeCategories).length === 0) return;
    if (customIncomeCategoriesSaveTimer.current) clearTimeout(customIncomeCategoriesSaveTimer.current);
    customIncomeCategoriesSaveTimer.current = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ customIncomeCategories: state.customIncomeCategories }),
      }).catch(() => {
        // Best-effort — the next sign-in's sync call will retry with
        // whatever's in memory or localStorage by then.
      });
    }, 800);
    return () => {
      if (customIncomeCategoriesSaveTimer.current) clearTimeout(customIncomeCategoriesSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.customIncomeCategories, state.screen]);

  // Same debounced persistence, for budgets/budgetDueDates/budgetReminders
  // together — see the migration and syncUserBudgetData above for why
  // this exists: without it, budget data only lived in localStorage and
  // every sign-out silently erased it.
  const budgetDataSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isPreAuthScreen(state.screen) || Object.keys(state.budgets).length === 0) return;
    if (budgetDataSaveTimer.current) clearTimeout(budgetDataSaveTimer.current);
    budgetDataSaveTimer.current = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          budgetData: {
            budgets: state.budgets,
            budgetDueDates: state.budgetDueDates,
            budgetReminders: state.budgetReminders,
            budgetPeriods: state.budgetPeriods,
            budgetTerms: state.budgetTerms,
          },
        }),
      }).catch(() => {
        // Best-effort — the next sign-in's syncUserBudgetData call will
        // retry with whatever's in memory or localStorage by then.
      });
    }, 800);
    return () => {
      if (budgetDataSaveTimer.current) clearTimeout(budgetDataSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.budgets, state.budgetDueDates, state.budgetReminders, state.budgetPeriods, state.budgetTerms, state.screen]);

  // BUG FIX: handleLogout used to call supabase.auth.signOut() and wipe
  // localStorage right away, with no regard for whether the debounced
  // save effects above (customCategories/customIncomeCategories/budgets)
  // had actually fired yet. Signing out shortly after an edit — a very
  // realistic sequence when someone edits something and then immediately
  // signs out to test it, or just to leave — canceled the pending
  //800ms-debounced save (its cleanup fires when state resets on
  // SIGNED_OUT) before it ever reached the server, so the edit was lost
  // the moment localStorage was cleared. This flushes the current values
  // synchronously, in one request, before sign-out is allowed to proceed.
  const flushPendingProfileSaves = useCallback(async () => {
    if (customCategoriesSaveTimer.current) clearTimeout(customCategoriesSaveTimer.current);
    if (customIncomeCategoriesSaveTimer.current) clearTimeout(customIncomeCategoriesSaveTimer.current);
    if (budgetDataSaveTimer.current) clearTimeout(budgetDataSaveTimer.current);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          customCategories: customCategoriesRef.current,
          customIncomeCategories: customIncomeCategoriesRef.current,
          budgetData: {
            budgets: budgetsRef.current,
            budgetDueDates: budgetDueDatesRef.current,
            budgetReminders: budgetRemindersRef.current,
            budgetPeriods: budgetPeriodsRef.current,
            budgetTerms: budgetTermsRef.current,
          },
        }),
      });
    } catch {
      // If this fails (offline, etc.), signing out proceeds anyway below
      // rather than trapping the person — worst case is the same
      // pre-existing risk this function exists to shrink, not eliminate.
    }
  }, []);

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
      await flushPendingProfileSaves();
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY);
      // Explicit 'auth', not just freshState(lang) — freshState() defaults
      // to 'loading' (for the initial-mount case), which would leave a
      // just-signed-out user stuck on the loading spinner forever since
      // nothing else is going to come along and resolve it.
      setState({ ...freshState(state.lang), screen: 'auth' });
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
        addToast(tr.deleteAccountFailedError, 'error');
        return;
      }
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY);
      setState({ ...freshState(state.lang), screen: 'auth' });
      setActiveTab('dashboard');
    } catch {
      addToast(tr.deleteAccountFailedError, 'error');
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
        body: JSON.stringify({ code, date: todayLocalDate() }),
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
    addToast(`${tx.type === 'income' ? '💰' : '💸'} ${tr.transactionSavedToast}`, 'success');
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
    addToast(tr.transactionUpdatedToast, 'success');
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) upsertTransaction(tx, user.id);
    });
  };

  const handleDeleteTransaction = (id: string) => {
    // Tombstone this ID locally *before* anything else — see
    // syncTransactions/markTransactionDeletedLocally in lib/transactionSync.ts.
    // Without this, a stale local snapshot on another device/tab could
    // see the deletion as an unsynced add and push the transaction right
    // back onto the server.
    markTransactionDeletedLocally(id);
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
    addToast(tr.transactionDeletedToast, 'info');
    deleteTransactionRemote(id);
  };

  // Starts a brand-new Stripe subscription (free users) via Checkout, OR
  // upgrades/downgrades an existing active subscription in-place with
  // proration (no duplicate subscriptions, no double billing).
  const handleStartCheckout = async (plan: 'basic' | 'pro' | 'business', billingPeriod: 'monthly' | 'yearly') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // BUG FIX: this used to show tr.signingOut ("Signing out...") as the
      // error message here — a copy-paste mix-up that told someone whose
      // session had expired that they were being signed out, instead of
      // telling them what actually happened and what to do about it.
      addToast(tr.sessionExpiredError, 'error');
      return;
    }

    const hasActivePlan = state.plan && state.plan !== 'free';

    try {
      if (hasActivePlan) {
        const res = await fetch('/api/stripe/change-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ plan, billingPeriod }),
        });
        const data = await res.json();
        if (data.success) {
          addToast(data.isUpgrade ? tr.planUpgraded : tr.planChanged, 'success');
          setShowUpgrade(false);
          await refreshSubscription();
        } else {
          addToast(data.error || tr.planChangeFailedError, 'error');
        }
        return;
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan, billingPeriod }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast(data.error || tr.checkoutFailedError, 'error');
      }
    } catch {
      addToast(tr.checkoutFailedError, 'error');
    }
  };

  // Opens the Stripe Customer Portal for payment-method updates, invoice
  // history, and cancellation. In-app plan upgrades/downgrades now go
  // through UpgradeModal -> handleStartCheckout (see PlanModal's
  // "changePlanBtn"), so users no longer have to leave FinSnap just to
  // move to a higher tier.
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
        addToast(data.error || tr.manageSubscriptionFailedError, 'error');
      }
    } catch {
      addToast(tr.manageSubscriptionFailedError, 'error');
    }
  };

  const handleSaveBudgets = (
    budgets: Record<string, number>,
    customCategories: Record<string, string>,
    budgetDueDates: AppState['budgetDueDates'],
    budgetReminders: Record<string, boolean>,
    budgetPeriods: AppState['budgetPeriods'],
    budgetTerms: AppState['budgetTerms']
  ) => {
    setState(prev => ({ ...prev, budgets, customCategories, budgetDueDates, budgetReminders, budgetPeriods, budgetTerms }));
    setShowBudget(false);
    addToast(tr.saveBudgets, 'success');
  };

  const handleAddCustomCategory = (key: string, label: string) => {
    setState(prev => ({ ...prev, customCategories: { ...prev.customCategories, [key]: label } }));
  };

  // The single source of truth for which "bucket" is currently being
  // viewed. Every list, chart, and total on screen is derived from this —
  // switching it (from Settings or the header pill) instantly shows a
  // completely separate slice of the data, never a mix of both.
  const activeAccountType = state.accountType || 'personal';
  const filteredTransactions = useMemo(
    () => state.transactions.filter(t => (t.accountType || 'personal') === activeAccountType),
    [state.transactions, activeAccountType]
  );
  // Dashboard reads several fields off of `state` directly (budgets,
  // draftQueue, etc.) — swapping in the filtered list here means it stays
  // untouched everywhere else while never seeing the other bucket's transactions.
  const dashboardState = useMemo(
    () => ({ ...state, transactions: filteredTransactions }),
    [state, filteredTransactions]
  );

  const isRtl = state.lang === 'FA';
  const isLoggedIn = !isPreAuthScreen(state.screen);

  // Quick Scan entry point (fast-path shortcut for tax-prep receipts):
  // paid-plan users go straight into the OCR capture screen; anyone
  // without scan access never sees the scanner at all — they're routed
  // straight to the plan picker instead.
  const handleQuickScanClick = () => {
    if (state.hasScanAccess) {
      setShowQuickScan(true);
    } else {
      setShowUpgrade(true);
    }
  };

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
        accountType={state.accountType}
        onChangeAccountType={handleChangeAccountType}
        showAccountTypeSwitch={state.screen === 'dashboard'}
      />

      <main>
        {state.screen === 'loading' && (
          <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" role="status" aria-label={tr.loadingLabel} />
          </div>
        )}

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
                state={dashboardState}
                tr={tr}
                onAddTransaction={() => setShowTransactionModal(true)}
                onOpenUpgrade={() => setShowUpgrade(true)}
                onOpenTaxReport={() => setShowTaxReport(true)}
                onApplyCode={handleApplyCode}
                onOpenPlanManager={() => setShowPlanManager(true)}
                onOpenBudget={() => setShowBudget(true)}
                onQuickScan={handleQuickScanClick}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsTab
                transactions={filteredTransactions}
                tr={tr}
                lang={state.lang}
                onEdit={tx => setEditingTransaction(tx)}
                customCategories={state.customCategories}
                customIncomeCategories={state.customIncomeCategories}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsTab
                transactions={filteredTransactions}
                lang={state.lang}
                tr={tr}
                customCategories={state.customCategories}
                customIncomeCategories={state.customIncomeCategories}
              />
            )}
            {activeTab === 'pricing' && (
              <PricingTab
                lang={state.lang}
                accountType={state.accountType || 'personal'}
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

      {/* Quick Scan fast-path: always-available shortcut so someone who
          just wants to fire off a tax receipt doesn't have to navigate
          into the dashboard/menus first. Pinned near the top (just under
          the sticky header) so it's immediately visible on load, not
          buried below the fold. Gated in handleQuickScanClick — free
          users are sent straight to the plan picker instead of ever
          seeing the scanner. */}
      {/* Quick Scan fast-path shortcut. On the dashboard it lives inline in
          the tier/scan-status row (see Dashboard.tsx); here we only need a
          floating version for the onboarding screen, which doesn't have
          that row yet. */}
      {state.screen === 'onboarding' && (
        <button
          onClick={handleQuickScanClick}
          title={tr.quickScanFabLabel}
          className="fixed z-40 top-32 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-300/50 active:scale-95 transition-transform"
        >
          <Zap className="w-3.5 h-3.5" fill="currentColor" />
          {tr.quickScanFabLabel}
        </button>
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

      {showQuickScan && (
        <TransactionModal
          {...transactionModalProps}
          quickScan
          onClose={() => setShowQuickScan(false)}
          onSaveManual={tx => { handleSaveManual(tx); setShowQuickScan(false); }}
          onOpenUpgrade={() => { setShowQuickScan(false); setShowUpgrade(true); }}
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

      {showTaxReport && (
        <TaxReportModal
          tr={tr}
          tier={state.tier}
          lang={state.lang}
          transactions={filteredTransactions}
          onClose={() => setShowTaxReport(false)}
          onOpenUpgrade={() => { setShowTaxReport(false); setShowUpgrade(true); }}
          customCategories={state.customCategories}
          customIncomeCategories={state.customIncomeCategories}
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
          onOpenUpgrade={() => { setShowPlanManager(false); setShowUpgrade(true); }}
        />
      )}

      {showBudget && (
        <BudgetModal
          tr={tr}
          accountType={state.accountType || 'personal'}
          lang={state.lang}
          budgets={state.budgets}
          customCategories={state.customCategories}
          budgetDueDates={state.budgetDueDates}
          budgetReminders={state.budgetReminders}
          budgetPeriods={state.budgetPeriods}
          budgetTerms={state.budgetTerms}
          onSave={handleSaveBudgets}
          onClose={() => setShowBudget(false)}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} tr={tr} />
    </div>
  );
}
