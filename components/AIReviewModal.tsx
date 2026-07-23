'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { Transaction, AccountType, Lang } from '@/lib/types';
import { formatCurrency, getOrCreateCategoryKey } from '@/lib/utils';

interface AIReviewModalProps {
  tr: Translations;
  draftId: string;
  transactionType: 'income' | 'expense';
  accountType: AccountType;
  lang: Lang;
  customCategories?: Record<string, string>;
  onAddCustomCategory?: (key: string, label: string) => void;
  onConfirm: (tx: Transaction) => void;
  onClose: () => void;
}

const EXPENSE_CATS_PERSONAL = ['catGroceries', 'catRestaurant', 'catTransport', 'catUtilities', 'catHealth', 'catEntertainment', 'catOther'];
const EXPENSE_CATS_BUSINESS = ['catBusinessMaterials', 'catOffice', 'catMarketing', 'catSoftware', 'catTravel', 'catRestaurant', 'catTransport', 'catOther'];
const INCOME_CATS = ['catSalary', 'catFreelance', 'catInvestments', 'catRental', 'catOtherIncome'];

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AIReviewModal({ tr, draftId, transactionType, accountType, lang, customCategories = {}, onAddCustomCategory, onConfirm, onClose }: AIReviewModalProps) {
  const defaultCat = transactionType === 'income'
    ? 'catFreelance'
    : (accountType === 'business' ? 'catBusinessMaterials' : 'catGroceries');

  const [category, setCategory] = useState(defaultCat);
  const [txAccountType, setTxAccountType] = useState<AccountType>(accountType);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const customExpenseCatKeys = Object.keys(customCategories);
  const cats = transactionType === 'income'
    ? INCOME_CATS
    : [...(txAccountType === 'business' ? EXPENSE_CATS_BUSINESS : EXPENSE_CATS_PERSONAL), ...customExpenseCatKeys];

  const handleConfirmNewCategory = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    const { key } = getOrCreateCategoryKey(label, customCategories);
    onAddCustomCategory?.(key, label);
    setCategory(key);
    setNewCatLabel('');
    setShowNewCatInput(false);
  };

  const mockData = {
    merchant: 'Costco Wholesale',
    originalCurrency: 'USD',
    originalAmount: 135.00,
    convertedAmount: 182.25,
    taxAmount: 11.40,
    date: new Date().toISOString().slice(0, 10),
  };

  const handleConfirm = () => {
    const tx: Transaction = {
      id: generateId(),
      type: transactionType,
      accountType: txAccountType,
      amount: mockData.convertedAmount,
      description: mockData.merchant,
      category,
      date: mockData.date,
      hasReceipt: true,
      merchant: mockData.merchant,
      taxAmount: mockData.taxAmount,
      originalCurrency: mockData.originalCurrency,
      originalAmount: mockData.originalAmount,
    };
    onConfirm(tx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pb-8 pt-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-sm">🤖</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{tr.aiReviewTitle}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">{tr.aiDisclaimer}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{tr.settingsAccountType}</label>
              <div className="flex gap-2">
                {(['personal', 'business'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTxAccountType(opt)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      txAccountType === opt ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {opt === 'business' ? `💼 ${tr.business}` : `🏠 ${tr.personal}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tr.merchant}</span>
                <span className="text-sm font-bold text-slate-900">{mockData.merchant}</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tr.currency}</span>
                <div className="text-right" dir="ltr">
                  <div className="text-sm font-bold text-slate-900">{formatCurrency(mockData.convertedAmount, lang, 2)} CAD</div>
                  <div className="text-xs text-slate-500">{mockData.originalCurrency} → {formatCurrency(mockData.originalAmount, lang, 2)}</div>
                </div>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tr.taxAmount}</span>
                <span className="text-sm font-bold text-rose-600" dir="ltr">{formatCurrency(mockData.taxAmount, lang, 2)} CAD</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                {tr.aiCategory}
                <span className="ml-2 text-xs font-normal text-emerald-600 normal-case">(AI suggested — you can change this)</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => {
                    if (e.target.value === '__add_new__') {
                      setShowNewCatInput(true);
                      setCategory('');
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-emerald-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all appearance-none font-medium"
                >
                  {cats.map(c => (
                    <option key={c} value={c}>{(tr as any)[c] ?? customCategories[c] ?? c}</option>
                  ))}
                  {transactionType === 'expense' && (
                    <option value="__add_new__">{tr.addNewCategory}</option>
                  )}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {showNewCatInput && (
                  <div className="mt-2 flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newCatLabel}
                      onChange={e => setNewCatLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmNewCategory(); } if (e.key === 'Escape') { setShowNewCatInput(false); setNewCatLabel(''); } }}
                      placeholder={tr.newCategoryLabel}
                      className="flex-1 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                      dir="auto"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmNewCategory}
                      disabled={!newCatLabel.trim()}
                      className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewCatInput(false); setNewCatLabel(''); }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-all"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {tr.confirmSave}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
