'use client';

import { useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, Upload, ScanLine, CheckCircle, AlertCircle, AlertTriangle, Trash2, Lock } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { TransactionType, AccountType, Tier, Transaction, ReceiptItem } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getOrCreateCategoryKey } from '@/lib/utils';

type ModalStep = 'type' | 'receipt' | 'manual' | 'ocr';
type OcrStatus = 'idle' | 'scanning' | 'done' | 'error';

interface TransactionModalProps {
  tr: Translations;
  accountType: AccountType;
  tier: Tier;
  hasManualAccess: boolean;
  hasScanAccess: boolean;
  scansUsedToday: number;
  maxDailyScans: number;
  editTransaction?: Transaction;
  customCategories?: Record<string, string>;
  onAddCustomCategory?: (key: string, label: string) => void;
  onClose: () => void;
  onSaveManual: (tx: Transaction) => void;
  onUpdate?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  onStartReceiptUpload: (type: TransactionType) => void;
  onScanConsumed: (scansUsed: number) => void;
  onOpenUpgrade: () => void;
  onScanBlocked: () => void;
}

const EXPENSE_CATEGORIES_PERSONAL = [
  'catGroceries', 'catRestaurant', 'catTransport', 'catUtilities',
  'catHealth', 'catEntertainment', 'catOther',
];
const EXPENSE_CATEGORIES_BUSINESS = [
  'catBusinessMaterials', 'catOffice', 'catMarketing', 'catSoftware',
  'catTravel', 'catRestaurant', 'catTransport', 'catUtilities', 'catOther',
];
const INCOME_CATEGORIES = ['catSalary', 'catFreelance', 'catInvestments', 'catRental', 'catOtherIncome'];

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}



export default function TransactionModal({
  tr, accountType, tier, hasManualAccess, hasScanAccess, scansUsedToday, maxDailyScans,
  editTransaction, customCategories = {}, onAddCustomCategory,
  onClose, onSaveManual, onUpdate, onDelete,
  onStartReceiptUpload, onScanConsumed, onOpenUpgrade, onScanBlocked,
}: TransactionModalProps) {
  const isEditMode = !!editTransaction;

  const [step, setStep] = useState<ModalStep>(isEditMode ? 'manual' : 'type');
  const [txType, setTxType] = useState<TransactionType>(editTransaction?.type ?? 'expense');
  // Which "bucket" this specific transaction belongs to. Defaults to the
  // user's current global setting, but can be overridden per-transaction —
  // e.g. someone in "Business" mode still occasionally logs a personal
  // expense, and shouldn't have to leave the modal to do it.
  const [txAccountType, setTxAccountType] = useState<AccountType>(editTransaction?.accountType ?? accountType);
  const [amount, setAmount] = useState(editTransaction ? String(editTransaction.amount) : '');
  const [description, setDescription] = useState(editTransaction?.description ?? '');
  const [category, setCategory] = useState(editTransaction?.category ?? '');
  const [date, setDate] = useState(editTransaction?.date ?? new Date().toISOString().slice(0, 10));
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrBanner, setOcrBanner] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>(editTransaction?.items || []);
  const [taxAmount, setTaxAmount] = useState<number | undefined>(editTransaction?.taxAmount);
  const [receiptHash, setReceiptHash] = useState<string | null>(null);
  const [receiptImageBase64, setReceiptImageBase64] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ matchedMerchant: string | null; matchedDate: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scansLeft = Math.max(0, maxDailyScans - scansUsedToday);
  const scanExhausted = scansLeft <= 0;
  const expenseCats = txAccountType === 'business' ? EXPENSE_CATEGORIES_BUSINESS : EXPENSE_CATEGORIES_PERSONAL;
  const customExpenseCatKeys = Object.keys(customCategories);
  const cats = txType === 'income' ? INCOME_CATEGORIES : [...expenseCats, ...customExpenseCatKeys];

  const handleConfirmNewCategory = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    const { key } = getOrCreateCategoryKey(label, customCategories);
    onAddCustomCategory?.(key, label);
    setCategory(key);
    setNewCatLabel('');
    setShowNewCatInput(false);
  };

  const handleTypeSelect = (type: TransactionType) => {
    setTxType(type);
    setCategory(type === 'income' ? 'catSalary' : (txAccountType === 'business' ? 'catBusinessMaterials' : 'catGroceries'));
    setStep('receipt');
  };

  const handleReceiptYes = async () => {
    if (scanExhausted) {
      onScanBlocked();
      return;
    }
    // The actual, authoritative check-and-consume now happens atomically
    // inside /api/ocr right before it spends money on the Claude API call
    // — see runOcr's 403 handling below. This client-side check is just a
    // fast, friendly guard to avoid an unnecessary round trip when we
    // already know the answer.
    setStep('ocr');
  };

  const runOcr = useCallback(async (file: File) => {
    setOcrStatus('scanning');
    setOcrProgress(30);
    setOcrBanner(tr.ocrScanning);
    try {
      // Resize image before sending to reduce size
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1200;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });
      setOcrProgress(60);
      setReceiptImageBase64(base64);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ image: base64, mimeType: 'image/jpeg' }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          onScanBlocked();
          setStep('receipt');
          return;
        }
        const errText = await response.text().catch(() => 'Unknown error');
        console.error('OCR API error:', response.status, errText);
        throw new Error(`OCR API returned ${response.status}`);
      }

      const parsed = await response.json();
      setOcrProgress(100);

      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.description) setDescription(parsed.description);
      if (parsed.date) setDate(parsed.date);
      if (parsed.items && parsed.items.length > 0) setReceiptItems(parsed.items);
      if (parsed.receiptHash) setReceiptHash(parsed.receiptHash);
      if (parsed.tax) setTaxAmount(parseFloat(parsed.tax) || undefined);
      if (typeof parsed.scansUsed === 'number') onScanConsumed(parsed.scansUsed);
      if (parsed.duplicate?.isDuplicate) {
        setDuplicateWarning({
          matchedMerchant: parsed.duplicate.matchedMerchant,
          matchedDate: parsed.duplicate.matchedDate,
        });
      } else {
        setDuplicateWarning(null);
      }

      setOcrStatus('done');
      setOcrBanner(tr.ocrReady);
      setTimeout(() => setStep('manual'), 600);
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrStatus('error');
      setOcrBanner('OCR failed — please enter details manually.');
      setTimeout(() => setStep('manual'), 1200);
    }
  }, [tr.ocrScanning, tr.ocrReady]);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    runOcr(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runOcr(file);
  };

  const handleSave = () => {
    if (!amount || !description) return;
    const tx: Transaction = {
      id: editTransaction?.id ?? generateId(),
      type: txType,
      accountType: txAccountType,
      amount: parseFloat(amount),
      description,
      category,
      date,
      hasReceipt: editTransaction?.hasReceipt ?? (step === 'manual' && ocrStatus !== 'idle'),
      items: receiptItems.length > 0 ? receiptItems : undefined,
      taxAmount,
      receiptHash: receiptHash || undefined,
    };
    if (isEditMode && onUpdate) {
      onUpdate(tx);
    } else {
      onSaveManual(tx);
    }
    // Only receipts that actually went through OCR get a fingerprint —
    // manually-entered transactions have nothing to compare against.
    if (receiptHash) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        fetch('/api/receipts/record-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            receiptHash,
            merchant: description,
            amount: parseFloat(amount),
            date,
            image: receiptImageBase64,
          }),
        }).catch(() => { /* non-critical — a missed fingerprint just means one fewer future duplicate check */ });
      });
    }
  };

  const handleConfirmDelete = () => {
    if (editTransaction && onDelete) {
      onDelete(editTransaction.id);
    }
  };

  const modalTitle = isEditMode ? tr.editTransaction : tr.addTransactionTitle;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pb-8 pt-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {step !== 'type' && !isEditMode && (
                <button
                  onClick={() => {
                    if (step === 'ocr') setStep('receipt');
                    else if (step === 'manual') setStep('receipt');
                    else setStep('type');
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
              )}
              <h2 className="text-lg font-bold text-slate-900">{modalTitle}</h2>
            </div>
            <div className="flex items-center gap-1">
              {isEditMode && onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                </button>
              )}
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-rose-800">{tr.confirmDelete}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-sm transition-all active:scale-[0.98]"
                >
                  {tr.yes}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
                >
                  {tr.no}
                </button>
              </div>
            </div>
          )}

          {/* Step: type */}
          {step === 'type' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">Select the transaction type:</p>
              <button
                onClick={() => handleTypeSelect('income')}
                className="w-full flex items-center gap-4 p-5 border-2 border-slate-200 hover:border-emerald-400 rounded-2xl text-left transition-all duration-150 hover:bg-emerald-50 active:scale-[0.98] group"
              >
                <div className="text-3xl">💰</div>
                <div>
                  <div className="font-bold text-slate-900">{tr.incomeLabel}</div>
                  <div className="text-sm text-slate-500">Money coming in</div>
                </div>
                <div className="ml-auto w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-500 flex items-center justify-center transition-all">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
              <button
                onClick={() => handleTypeSelect('expense')}
                className="w-full flex items-center gap-4 p-5 border-2 border-slate-200 hover:border-rose-400 rounded-2xl text-left transition-all duration-150 hover:bg-rose-50 active:scale-[0.98] group"
              >
                <div className="text-3xl">💸</div>
                <div>
                  <div className="font-bold text-slate-900">{tr.expenseLabel}</div>
                  <div className="text-sm text-slate-500">Money going out</div>
                </div>
                <div className="ml-auto w-8 h-8 rounded-full bg-slate-50 group-hover:bg-rose-500 flex items-center justify-center transition-all">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            </div>
          )}

          {/* Step: receipt */}
          {step === 'receipt' && (
            <div className="space-y-3">
              <div className="mb-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${txType === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {txType === 'income' ? '💰' : '💸'} {txType === 'income' ? tr.income : tr.expense}
                </span>
              </div>
              <p className="text-base font-semibold text-slate-800">{tr.receiptQuestion}</p>

              {/* Scan/OCR: exclusively for active paid plans — never shown as a
                  usable option for free users or daily-code users, per the
                  rule that OCR must stay exclusive to purchased plans. */}
              {hasScanAccess ? (
                <button
                  onClick={handleReceiptYes}
                  className={`w-full flex items-center gap-4 p-5 border-2 rounded-2xl text-left transition-all duration-150 active:scale-[0.98] group ${scanExhausted ? 'border-slate-200 opacity-60 cursor-not-allowed' : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50'}`}
                >
                  <div className="text-3xl">📸</div>
                  <div>
                    <div className="font-bold text-slate-900">{tr.yesUpload}</div>
                    <div className="text-xs text-slate-500 mt-0.5" dir="ltr">
                      {scansLeft > 0 ? `${scansLeft} scan${scansLeft !== 1 ? 's' : ''} left this month` : tr.scanLimitReached}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                    <ScanLine className="w-3.5 h-3.5" />
                    OCR
                  </div>
                </button>
              ) : (
                <button
                  onClick={onOpenUpgrade}
                  className="w-full flex items-center gap-4 p-5 border-2 border-dashed border-slate-200 rounded-2xl text-left transition-all duration-150 hover:border-teal-300 hover:bg-teal-50 active:scale-[0.98]"
                >
                  <div className="text-3xl opacity-50">📸</div>
                  <div>
                    <div className="font-bold text-slate-500">{tr.yesUpload}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{tr.scanRequiresPlan}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </button>
              )}

              {/* Manual entry: available to plan holders AND today's daily-code
                  redeemers — but not to a fully free/locked user. */}
              {hasManualAccess ? (
                <button
                  onClick={() => setStep('manual')}
                  className="w-full flex items-center gap-4 p-5 border-2 border-slate-200 hover:border-slate-400 rounded-2xl text-left transition-all duration-150 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <div className="text-3xl">✍️</div>
                  <div>
                    <div className="font-bold text-slate-900">{tr.noManual}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{tr.enterDetailsYourself}</div>
                  </div>
                </button>
              ) : (
                <div className="w-full flex items-center gap-4 p-5 border-2 border-dashed border-slate-200 rounded-2xl opacity-70">
                  <div className="text-3xl opacity-50">✍️</div>
                  <div>
                    <div className="font-bold text-slate-500">{tr.noManual}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{tr.manualRequiresCodeOrPlan}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: OCR scanner */}
          {step === 'ocr' && (
            <div className="space-y-4">
              <div className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 ${dragging ? 'border-teal-400 bg-teal-50' : 'border-slate-300 hover:border-teal-300 hover:bg-slate-50'}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                  onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center pointer-events-none">
                  {ocrStatus === 'idle' && (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
                        <Upload className="w-7 h-7 text-teal-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 mb-1">{tr.uploadReceipt}</p>
                      <p className="text-xs text-slate-400">{tr.ocrHint}</p>
                    </>
                  )}
                  {ocrStatus === 'scanning' && (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
                        <ScanLine className="w-7 h-7 text-teal-600 animate-pulse" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 mb-3">{tr.ocrScanning}</p>
                      <div className="w-full max-w-[200px] h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2" dir="ltr">{ocrProgress}%</p>
                    </>
                  )}
                  {(ocrStatus === 'done' || ocrStatus === 'error') && (
                    <>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${ocrStatus === 'done' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                        {ocrStatus === 'done'
                          ? <CheckCircle className="w-7 h-7 text-emerald-600" />
                          : <AlertCircle className="w-7 h-7 text-rose-500" />
                        }
                      </div>
                      <p className={`text-sm font-semibold ${ocrStatus === 'done' ? 'text-emerald-700' : 'text-rose-600'}`}>{ocrBanner}</p>
                    </>
                  )}
                </div>
              </div>

              {ocrStatus === 'idle' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-teal-200 hover:shadow-teal-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <ScanLine className="w-4 h-4" />
                  {tr.scanReceipt}
                </button>
              )}

              <button
                onClick={() => setStep('manual')}
                className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
              >
                {tr.noManual}
              </button>
            </div>
          )}

          {/* Step: manual entry */}
          {step === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{tr.settingsAccountType}</label>
                <div className="flex gap-2">
                  {(['personal', 'business'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTxAccountType(opt);
                        // Keep the category sane if it doesn't exist in the new bucket's list.
                        if (txType === 'expense') {
                          const nextCats = opt === 'business' ? EXPENSE_CATEGORIES_BUSINESS : EXPENSE_CATEGORIES_PERSONAL;
                          if (!nextCats.includes(category) && !customExpenseCatKeys.includes(category)) {
                            setCategory(opt === 'business' ? 'catBusinessMaterials' : 'catGroceries');
                          }
                        }
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        txAccountType === opt ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {opt === 'business' ? `💼 ${tr.business}` : `🏠 ${tr.personal}`}
                    </button>
                  ))}
                </div>
              </div>

              {ocrBanner && (
                <div className={`flex items-center gap-2 text-xs font-medium rounded-xl px-3 py-2 ${ocrStatus === 'done' ? 'bg-emerald-50 text-emerald-700' : ocrStatus === 'error' ? 'bg-rose-50 text-rose-600' : ''}`}>
                  {ocrStatus === 'done' && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                  {ocrBanner}
                </div>
              )}

              {duplicateWarning && (
                <div className="flex items-start gap-2.5 text-xs font-medium rounded-xl px-3 py-2.5 bg-amber-50 text-amber-800 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold mb-0.5">{tr.duplicateReceiptTitle}</div>
                    <div className="text-amber-700 font-normal">
                      {tr.duplicateReceiptDesc
                        .replace('{merchant}', duplicateWarning.matchedMerchant || '')
                        .replace('{date}', duplicateWarning.matchedDate || '')}
                    </div>
                  </div>
                  <button onClick={() => setDuplicateWarning(null)} className="shrink-0">
                    <X className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                </div>
              )}

              {isEditMode && (
                <div className="flex gap-2 mb-2">
                  {(['income', 'expense'] as TransactionType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setTxType(t);
                        const defaultCat = t === 'income' ? 'catSalary' : (txAccountType === 'business' ? 'catBusinessMaterials' : 'catGroceries');
                        if (!cats.includes(category)) setCategory(defaultCat);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${txType === t ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {t === 'income' ? `💰 ${tr.income}` : `💸 ${tr.expense}`}
                    </button>
                  ))}
                </div>
              )}


              {receiptItems.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {'Receipt Items / آیتم‌های رسید'}
                  </div>
                  <div className="space-y-1">
                    {receiptItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs text-slate-700">
                        <span>{item.name}</span>
                        <span className="font-semibold" dir="ltr">{item.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{tr.amount}</label>
                <div className="relative" dir="ltr">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{tr.description}</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={txType === 'income' ? 'e.g. Client invoice #12' : 'e.g. Office supplies'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                  dir="auto"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{tr.category}</label>
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all appearance-none"
                >
                  {cats.map(c => (
                    <option key={c} value={c}>{(tr as any)[c] ?? customCategories[c] ?? c}</option>
                  ))}
                  {txType === 'expense' && (
                    <option value="__add_new__">{tr.addNewCategory}</option>
                  )}
                </select>

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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{tr.date}</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                  dir="ltr"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!amount || !description}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditMode ? tr.updateTransaction : tr.save}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
