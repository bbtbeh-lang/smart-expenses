// @refresh reset
'use client';

import { useState, useCallback, useEffect } from 'react';
import { AppState, Transaction, DraftTransaction, TransactionType, VALID_CODES, AccountType, Lang } from '@/lib/types';
import { t } from '@/lib/translations';
import Header from '@/components/Header';
import NavBar, { NavTab } from '@/components/NavBar';
import AuthScreen from '@/components/AuthScreen';
import OnboardingScreen from '@/components/OnboardingScreen';
import Dashboard from '@/components/Dashboard';
import TransactionsTab from '@/components/TransactionsTab';
import SettingsTab from '@/components/SettingsTab';
import TransactionModal from '@/components/TransactionModal';
import AIReviewModal from '@/components/AIReviewModal';
import TaxReportModal from '@/components/TaxReportModal';
import UpgradeModal from '@/components/UpgradeModal';
import PlanModal from '@/components/PlanModal';
import BudgetModal from '@/components/BudgetModal';
import Toast, { ToastMessage } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function freshState(lang: Lang = 'EN'): AppState {
  return {
    screen: 'auth',
    lang,
    accountType: null,
    tier: 'free',
    codeActivated: false,
    scansUsedToday: 0,
    maxDailyScans: 2,
    transactions: [],
    draftQueue: [],
    totalIncome: 0,
    totalExpenses: 0,
    budgets: {},
    customCategories: {},
  };
}

export default function Home() {
  // مدیریت وضعیت با localStorage برای ماندگاری اطلاعات
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finsnap_data');
      return saved ? JSON.parse(saved) : freshState();
    }
    return freshState();
  });

  // ذخیره خودکار در localStorage با هر تغییر
  useEffect(() => {
    if (state.screen !== 'auth') {
      localStorage.setItem('finsnap_data', JSON.stringify(state));
    }
  }, [state]);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAIReview, setShowAIReview] = useState<DraftTransaction | null>(null);
  const [showTaxReport, setShowTaxReport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlanManager, setShowPlanManager] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  const handleLogin = (email: string) => {
    // دسترسی ویژه ادمین برای شما
    const isPremium = email.trim().toLowerCase() === 'bbtbeh@gmail.com';
    setState(prev => ({
      ...prev,
      screen: 'onboarding',
      tier: isPremium ? 'premium' : 'free',
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('finsnap_data');
    setState(freshState(state.lang));
    setActiveTab('dashboard');
  };

  // سایر توابع (handleSelectAccountType, handleSaveManual, handleApplyCode و غیره)
  // را دقیقاً از فایل قبلی خود در اینجا قرار دهید.
  // نکته: برای handleApplyCode، کدی که قبلاً با Supabase داشتید عالی است.

  // در انتهای فایل (بخش return)، ساختار JSX خود را قرار دهید.
  return (
    <div className="min-h-screen bg-slate-50" dir={state.lang === 'FA' ? 'rtl' : 'ltr'}>
      {/* بقیه اجزای UI شما ... */}
    </div>
  );
}
