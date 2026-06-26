'use client';

import { useState } from 'react';
import { X, Download, Lock, FileSpreadsheet, FileDown } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { Tier, Transaction, Lang } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface TaxReportModalProps {
  tr: Translations;
  tier: Tier;
  lang: Lang;
  transactions: Transaction[];
  onClose: () => void;
  onOpenUpgrade: () => void;
}

type Tab = 'summary' | 'ledger' | 'tax';

export default function TaxReportModal({ tr, tier, lang, transactions, onClose, onOpenUpgrade }: TaxReportModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [pdfLoading, setPdfLoading] = useState(false);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalTax = transactions.filter(t => t.taxAmount).reduce((s, t) => s + (t.taxAmount || 0), 0);
  const netProfit = totalIncome - totalExpenses;


  const handleDownloadExcel = () => {
    const rows: string[][] = [];
    
    // Header
    rows.push(['Date', 'Type', 'Merchant/Description', 'Category', 'Item', 'Item Price', 'Total Amount']);
    
    transactions.slice().reverse().forEach(tx => {
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item, i) => {
          rows.push([
            i === 0 ? tx.date : '',
            i === 0 ? tx.type : '',
            i === 0 ? tx.description : '',
            i === 0 ? tx.category : '',
            item.name,
            String(item.price),
            i === 0 ? String(tx.amount) : '',
          ]);
        });
      } else {
        rows.push([tx.date, tx.type, tx.description, tx.category, '', '', String(tx.amount)]);
      }
    });

    // Summary rows
    rows.push([]);
    rows.push(['SUMMARY', '', '', '', '', '', '']);
    rows.push(['Total Income', '', '', '', '', '', String(totalIncome)]);
    rows.push(['Total Expenses', '', '', '', '', '', String(totalExpenses)]);
    rows.push(['Net Profit', '', '', '', '', '', String(netProfit)]);

    const csvContent = rows.map(r => r.map(c => JSON.stringify(c)).join(',')).join('
');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finsnap-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      // Load html2pdf.js via script tag so it never enters the webpack bundle
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2pdf.js'));
          document.head.appendChild(script);
        });
      }
      const html2pdfFn = (window as any).html2pdf;
      const element = document.getElementById('tax-report-pdf-content');
      if (!element || !html2pdfFn) return;
      await html2pdfFn()
        .set({
          margin: 8,
          filename: 'finsnap-tax-report.pdf',
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
    } catch {
      // silently fall back
    } finally {
      setPdfLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'summary', label: tr.tabSummary },
    { id: 'ledger', label: tr.tabLedger },
    { id: 'tax', label: tr.tabTax },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl z-50 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pb-8 pt-2" id="tax-report-pdf-content">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{tr.taxReportTitle}</h2>
                <p className="text-xs text-slate-500">{tr.taxReportSub}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Workbook Tab Bar */}
          <div className="flex items-center gap-1 mb-5 bg-slate-100 p-1 rounded-xl" dir="ltr">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-150 ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'summary' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{tr.fiscalYear} 2024</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{tr.totalIncome}</span>
                    <span className="text-sm font-bold text-emerald-600" dir="ltr">{formatCurrency(totalIncome, lang, 2)}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{tr.totalExpenses}</span>
                    <span className="text-sm font-bold text-rose-500" dir="ltr">{formatCurrency(totalExpenses, lang, 2)}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">{tr.netProfit}</span>
                    <span className={`text-base font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">{formatCurrency(netProfit, lang, 2)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Transaction Count</div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-emerald-600">{transactions.filter(t => t.type === 'income').length}</div>
                    <div className="text-xs text-emerald-600">{tr.income}</div>
                  </div>
                  <div className="flex-1 bg-rose-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-rose-500">{transactions.filter(t => t.type === 'expense').length}</div>
                    <div className="text-xs text-rose-500">{tr.expense}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">No transactions yet.</div>
              ) : (
                transactions.slice().reverse().map(tx => (
                  <div key={tx.id} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{tx.description}</div>
                        <div className="text-xs text-slate-500">{tx.date} · {tx.category}</div>
                      </div>
                      <div className={`text-sm font-bold shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`} dir="ltr">
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, lang, 2)}
                      </div>
                    </div>
                    {tx.items && tx.items.length > 0 && (
                      <div className="mt-2 ml-5 space-y-0.5 border-t border-slate-200 pt-2">
                        {tx.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-500">
                            <span>{item.name}</span>
                            <span dir="ltr">{formatCurrency(item.price, lang, 2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {tx.hasReceipt && (
                      <div className="shrink-0">
                        {tier === 'premium' ? (
                          <span className="text-xs text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md font-medium">S3</span>
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              {tier === 'free' && transactions.some(t => t.hasReceipt) && (
                <div className="bg-slate-100 rounded-xl p-3 text-xs text-slate-500 text-center">{tr.ledgerNote}</div>
              )}
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                {[
                  { label: tr.totalGST, val: (totalTax * 0.05 / 0.15).toFixed(2), color: 'text-slate-800' },
                  { label: tr.totalHST, val: (totalTax * 0.13 / 0.15).toFixed(2), color: 'text-slate-800' },
                  { label: tr.totalQST, val: (totalTax * 0.09975 / 0.15).toFixed(2), color: 'text-slate-800' },
                  { label: tr.inputTaxCredits, val: (totalExpenses * 0.05).toFixed(2), color: 'text-emerald-600' },
                  { label: tr.netTaxOwing, val: (totalTax - totalExpenses * 0.05).toFixed(2), color: 'text-rose-600' },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">{label}</span>
                      <span className={`text-sm font-bold ${color}`} dir="ltr">{formatCurrency(parseFloat(val), lang, 2)}</span>
                    </div>
                    <div className="h-px bg-slate-200 mt-3" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {/* PDF — available to everyone */}
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {pdfLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : <FileDown className="w-4 h-4" />}
              {tr.downloadPDF}
            </button>

            {tier === 'premium' ? (
              <button onClick={handleDownloadExcel} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                {tr.downloadExcel}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">{tr.downloadBlocked}</p>
                </div>
                <button
                  onClick={() => { onClose(); onOpenUpgrade(); }}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {tr.upgradeToPremium}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
