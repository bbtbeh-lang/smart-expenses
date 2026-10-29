'use client';

import { useState, useEffect } from 'react';
import { X, Download, Lock, FileSpreadsheet, FileDown, Eye } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { Tier, Transaction, Lang } from '@/lib/types';
import { formatCurrency, resolveCategoryLabel, csvField, neutralizeCsvFormula, estimateTax, suggestTaxRate } from '@/lib/utils';
import { fetchServerTransactionsInRange } from '@/lib/transactionSync';
import { supabase } from '@/lib/supabase';

interface TaxReportModalProps {
  tr: Translations;
  tier: Tier;
  // Grants temporary access to gated exports the same way an active gift
  // code unlocks manual entry (see app/api/subscription/route.ts's
  // hasManualAccess) — a free-tier user with a currently-redeemed code
  // gets PDF/CSV export too, on top of manual entry, without needing to
  // upgrade. This is purely additive to `tier === 'premium'`; it never
  // downgrades a paying user's access.
  hasGiftAccess: boolean;
  lang: Lang;
  transactions: Transaction[];
  accountType?: 'personal' | 'business';
  onClose: () => void;
  onOpenUpgrade: () => void;
  customCategories?: Record<string, string>;
  customIncomeCategories?: Record<string, string>;
}

// Load html2pdf.js via script tag so it never enters the webpack bundle.
async function ensureHtml2Pdf(): Promise<any> {
  if (!(window as any).html2pdf) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load html2pdf.js'));
      document.head.appendChild(script);
    });
  }
  return (window as any).html2pdf;
}

type Tab = 'summary' | 'ledger' | 'tax';

export default function TaxReportModal({ tr, tier, hasGiftAccess, lang, transactions: allTransactions, accountType = 'personal', onClose, onOpenUpgrade, customCategories = {}, customIncomeCategories = {} }: TaxReportModalProps) {
  // BUG FIX: exports (PDF and CSV/Excel) were meant to be a paid-plan
  // feature per the in-app guide ("Downloading as CSV or PDF requires a
  // paid plan or an active gift code"), but only the CSV/Excel button
  // actually checked this — the PDF button below had no gate at all, so
  // every free-tier user could already download the tax report as a PDF
  // for free. `canExport` is the single source of truth both buttons
  // should check from here on.
  const canExport = tier === 'premium' || hasGiftAccess;
  const catLabel = (key: string) => resolveCategoryLabel(key, tr as unknown as Record<string, string>, customCategories, customIncomeCategories);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [categoryPdfLoading, setCategoryPdfLoading] = useState(false);
  // User-chosen rate for the ESTIMATE on receipts with no tax line. Kept per
  // device; the default (13) is only a starting point the user can change.
  const [estRateText, setEstRateText] = useState('13');
  useEffect(() => {
    try {
      const v = localStorage.getItem('finsnap_est_tax_rate');
      if (v !== null && isFinite(parseFloat(v))) { setEstRateText(v); return; }
    } catch { /* storage unavailable: fall through to the suggestion */ }
    // No saved choice yet: start from the rate this person's own receipts
    // most often show, instead of a hard-coded 13. Still fully editable.
    const suggested = suggestTaxRate(allTransactions);
    if (suggested) setEstRateText(String(suggested));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onEstRateChange = (raw: string) => {
    setEstRateText(raw);
    try { localStorage.setItem('finsnap_est_tax_rate', raw); } catch { /* ignore */ }
  };
  const estRate = Math.min(30, Math.max(0, parseFloat(estRateText) || 0));
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  // Transactions store dates as plain 'YYYY-MM-DD' strings (see
  // todayLocalDate in lib/utils.ts) specifically to avoid the
  // new Date("2026-07-27") UTC-midnight parsing bug — so we compare
  // the year as a string slice here too, instead of re-parsing with
  // `new Date(t.date)`, to stay consistent with that fix.
  // Report period: defaults to the current calendar year (the old fixed
  // behaviour), but the person can narrow it to a quarter, a month or any
  // custom range. Dates are plain 'YYYY-MM-DD' strings, so string
  // comparison is correct and timezone-safe. Every tab, both PDFs and the
  // CSV all read from this one filtered list.
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const periodStart = fromDate || '0000-01-01';
  const periodEnd = toDate || '9999-12-31';
  const periodLabel = `${fromDate || '…'} → ${toDate || '…'}`;
  const inPeriod = (d: string) => d >= periodStart && d <= periodEnd;
  const transactions = allTransactions.filter(t => inPeriod(t.date));
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate(); // m is 1-based
  const setRange = (f: string, t: string) => { setFromDate(f); setToDate(t); };
  const setQuarter = (q: number) => {
    const m1 = (q - 1) * 3 + 1, m3 = m1 + 2;
    setRange(`${currentYear}-${pad(m1)}-01`, `${currentYear}-${pad(m3)}-${pad(lastDay(currentYear, m3))}`);
  };
  const setThisMonth = () => {
    const m = new Date().getMonth() + 1;
    setRange(`${currentYear}-${pad(m)}-01`, `${currentYear}-${pad(m)}-${pad(lastDay(currentYear, m))}`);
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalTax = transactions.filter(t => t.taxAmount).reduce((s, t) => s + (t.taxAmount || 0), 0);
  // A scanned expense receipt with no tax amount: the receipt simply didn't
  // print a separate tax line (fuel receipts typically don't — the tax is
  // inside the pump price). That is NOT the same as zero tax, so the report
  // says so instead of showing a bare 0.00 / blank. Manual entries are
  // excluded: with no receipt there's nothing to say was "not itemized".
  const isUnitemized = (t: Transaction) => t.type === 'expense' && t.hasReceipt && !t.taxAmount;
  const unitemizedCount = transactions.filter(isUnitemized).length;
  const rateFor = (t: Transaction) => t.taxRate ?? estRate; // the receipt's own rate wins over the default
  const estTaxFor = (t: Transaction) => (isUnitemized(t) && rateFor(t) > 0 ? estimateTax(t.amount, rateFor(t)) : 0);
  const totalEstTax = transactions.reduce((s, t) => s + estTaxFor(t), 0);
  const netProfit = totalIncome - totalExpenses;

  // Per-category breakdown for the Tax tab — purely a re-grouping of data
  // the user already entered (amount + taxAmount per transaction). This
  // does NOT calculate any GST/HST/QST remittance figure; it just makes
  // the existing numbers easier for an accountant to work from, category
  // by category, instead of one lump total.
  const categoryBreakdown = (() => {
    const map: Record<string, { amount: number; tax: number; est: number }> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!map[t.category]) map[t.category] = { amount: 0, tax: 0, est: 0 };
        map[t.category].amount += t.amount;
        map[t.category].tax += t.taxAmount || 0;
        map[t.category].est += estTaxFor(t);
      });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  })();

  const handleViewReceipt = async (tx: Transaction) => {
    if (!tx.receiptHash) return;
    setLoadingReceiptId(tx.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/receipts/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ receiptHash: tx.receiptHash }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } finally {
      setLoadingReceiptId(null);
    }
  };

  // Accountant-style monthly report: one block per month, numbered rows,
  // pre-tax / tax / total split out explicitly, and a subtotal row per
  // month plus a grand total at the end — the format she hands to her
  // bookkeeper, not just a flat transaction dump. Pre-tax amount is
  // derived as amount − taxAmount, since `amount` is stored as the
  // receipt's final total (see the OCR prompt) and `taxAmount` is the
  // tax portion within it, not an addition on top.
  const handleDownloadExcel = () => {
    const rows: string[][] = [];
    const monthNames = lang === 'FA'
      ? ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const expenseTx = transactions.filter(t => t.type === 'expense').slice().sort((a, b) => a.date.localeCompare(b.date));

    const byMonth = new Map<string, Transaction[]>();
    expenseTx.forEach(t => {
      const key = t.date.slice(0, 7); // YYYY-MM
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(t);
    });

    let grandPretax = 0, grandTax = 0, grandEst = 0, grandTotal = 0;

    Array.from(byMonth.keys()).sort().forEach(monthKey => {
      const monthTx = byMonth.get(monthKey)!;
      const monthLabel = monthNames[parseInt(monthKey.slice(5, 7), 10) - 1];

      rows.push([`Month ${monthLabel} ${monthKey.slice(0, 4)}`]);
      // "Tax Type" holds the label as printed on the source document
      // ("GST", "MwSt", "VAT"...) rather than a fixed Canadian header,
      // since one report can mix receipts from different countries —
      // left blank when the receipt didn't have one recognized (older
      // scans, or a tax-exempt purchase).
      rows.push(['#', 'Description', 'Date', 'Store', 'Amount', 'Tax', 'Est. Tax', 'Tax Type', 'Total', 'Document']);

      let mPretax = 0, mTax = 0, mEst = 0, mTotal = 0;
      monthTx.forEach((tx, i) => {
        const tax = tx.taxAmount || 0;
        const pretax = tx.amount - tax;
        const est = estTaxFor(tx);
        mPretax += pretax; mTax += tax; mEst += est; mTotal += tx.amount;
        const [y, mo, d] = tx.date.split('-');
        rows.push([
          String(i + 1),
          neutralizeCsvFormula(tx.description),
          `${d}/${mo}/${y}`,
          neutralizeCsvFormula(tx.merchant || ''),
          pretax.toFixed(2),
          tax.toFixed(2),
          est > 0 ? est.toFixed(2) : '',
          neutralizeCsvFormula(tx.taxLabel || (isUnitemized(tx) ? (est > 0 ? `Estimated @ ${rateFor(tx)}%` : 'Not itemized on receipt') : '')),
          tx.amount.toFixed(2),
          tx.receiptHash ? 'Yes' : '',
        ]);
      });

      rows.push(['', '', '', 'total', mPretax.toFixed(2), mTax.toFixed(2), mEst.toFixed(2), '', mTotal.toFixed(2), '']);
      rows.push([]);
      grandPretax += mPretax; grandTax += mTax; grandEst += mEst; grandTotal += mTotal;
    });

    rows.push(['', '', '', 'GRAND TOTAL', grandPretax.toFixed(2), grandTax.toFixed(2), grandEst.toFixed(2), '', grandTotal.toFixed(2), '']);

    // Summary rows
    rows.push([]);
    rows.push(['SUMMARY', '', '', '', '', '', '', '']);
    rows.push(['Total Income', '', '', '', '', '', '', String(totalIncome)]);
    rows.push(['Total Expenses', '', '', '', '', '', '', String(totalExpenses)]);
    rows.push(['Net Profit', '', '', '', '', '', '', String(netProfit)]);

    if (categoryBreakdown.length > 0) {
      rows.push([]);
      rows.push(['TAX BY CATEGORY', '', '', '', '', '', '', '']);
      rows.push(['Category', 'Total Expense', 'Total Tax', 'Est. Tax', '', '', '', '']);
      categoryBreakdown.forEach(([cat, sums]) => {
        // BUG FIX: this used to only check `tr`, so any custom expense
        // category showed its raw internal key instead of the label the
        // person typed — on the report that goes straight to an accountant.
        const label = neutralizeCsvFormula(catLabel(cat));
        rows.push([label, String(sums.amount), String(sums.tax), sums.est.toFixed(2), '', '', '', '']);
      });
    }

    const NL = String.fromCharCode(10);
    // BUG FIX: this used to build each cell with JSON.stringify(c), which
    // escapes an internal quote as \" (backslash) — not valid CSV, where
    // RFC4180 requires doubling it ("") instead. A description containing
    // a literal quote character would silently corrupt the row's column
    // boundaries when opened in Excel. csvField does the correct escaping;
    // formula-injection neutralization already happened above, at push
    // time, for the specific free-text cells that needed it.
    const csvContent = rows.map(r => r.map(c => csvField(c)).join(',')).join(NL);
    // Leading UTF-8 BOM: without it, Excel on Windows opens this CSV using
    // the system locale's codepage instead of UTF-8, and Persian/French
    // characters (merchant names, category labels) render as mojibake.
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finsnap-tax-report-${fromDate || 'start'}_${toDate || 'end'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const html2pdfFn = await ensureHtml2Pdf();
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

  // One-tap accountant package: every expense of the year, grouped by
  // category, with per-category subtotals and a grand total. Built as a
  // detached DOM tree with textContent (never innerHTML) because merchant
  // names come from OCR/user input and must not be interpreted as markup.
  const handleDownloadAccountantPDF = async (groupBy: 'category' | 'month') => {
    setCategoryPdfLoading(true);
    let host: HTMLDivElement | null = null;
    try {
      const html2pdfFn = await ensureHtml2Pdf();
      if (!html2pdfFn) return;

      const rtl = lang === 'FA';
      // Build from what the SERVER holds, not from whatever this tab has in
      // memory (which can be stale or contain unsynced rows). Fall back to
      // local data only if the server can't be reached, and say so in the file.
      const serverTx = await fetchServerTransactionsInRange(periodStart, periodEnd, accountType);
      const source = serverTx ?? transactions;
      const expenses = source.filter(t => t.type === 'expense' && inPeriod(t.date));
      // Group by category (biggest first) or by calendar month (chronological).
      const monthLabel = (ym: string) => {
        const [y, m] = ym.split('-').map(Number);
        const loc = lang === 'FA' ? 'fa-IR-u-ca-gregory' : lang === 'FR' ? 'fr-CA' : 'en-CA';
        return `${new Date(y, m - 1, 1).toLocaleDateString(loc, { month: 'long' })} ${y}`;
      };
      const groupLabel = (key: string) => (groupBy === 'month' ? monthLabel(key) : catLabel(key));
      const byKey = new Map<string, Transaction[]>();
      expenses.forEach(t => {
        const k = groupBy === 'month' ? t.date.slice(0, 7) : t.category;
        if (!byKey.has(k)) byKey.set(k, []);
        byKey.get(k)!.push(t);
      });
      const groups = Array.from(byKey.entries())
        .map(([cat, txs]) => ({
          cat,
          txs: txs.slice().sort((a, b) => a.date.localeCompare(b.date)),
          amount: txs.reduce((s, t) => s + t.amount, 0),
          tax: txs.reduce((s, t) => s + (t.taxAmount || 0), 0),
          est: txs.reduce((s, t) => s + estTaxFor(t), 0),
        }))
        .sort((a, b) => (groupBy === 'month' ? a.cat.localeCompare(b.cat) : b.amount - a.amount));

      const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, css?: string) => {
        const e = document.createElement(tag);
        if (text !== undefined) e.textContent = text;
        if (css) e.style.cssText = css;
        return e;
      };
      const row = (cells: string[], css: string) => {
        const r = el('div', undefined, `display:flex;gap:8px;padding:4px 0;page-break-inside:avoid;${css}`);
        const widths = ['16%', '44%', '18%', '22%'];
        cells.forEach((c, i) => {
          const isNum = i >= 2;
          r.appendChild(el('div', c, `width:${widths[i]};${isNum ? `text-align:${rtl ? 'left' : 'right'};direction:ltr;` : ''}overflow-wrap:anywhere;`));
        });
        r.className = 'pdf-row';
        return r;
      };

      host = el('div', undefined, 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;');
      const root = el('div', undefined, `padding:24px;font-family:system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;font-size:12px;color:#0f172a;direction:${rtl ? 'rtl' : 'ltr'};`);
      host.appendChild(root);

      root.appendChild(el('div', `FinSnap — ${groupBy === 'month' ? tr.monthPdfTitle : tr.categoryPdfTitle}`, 'font-size:18px;font-weight:700;margin-bottom:2px;'));
      root.appendChild(el('div', periodLabel, 'color:#64748b;margin-bottom:4px;'));
      root.appendChild(el('div',
        serverTx ? tr.pdfSourceServer.replace('{time}', new Date().toLocaleString(lang === 'FA' ? 'fa-IR' : lang === 'FR' ? 'fr-CA' : 'en-CA')) : tr.pdfSourceLocal,
        `font-size:10px;margin-bottom:16px;color:${serverTx ? '#94a3b8' : '#dc2626'};`));

      if (groups.length === 0) {
        root.appendChild(el('div', tr.categoryPdfNoExpenses, 'color:#64748b;'));
      } else {
        // Totals go FIRST. html2pdf can drop the tail of a long document
        // when it inserts page-break spacers, so the numbers an accountant
        // needs must never depend on the last page surviving.
        const grandAmount = groups.reduce((s, g) => s + g.amount, 0);
        const grandTax = groups.reduce((s, g) => s + g.tax, 0);
        const grandEst = groups.reduce((s, g) => s + g.est, 0);
        const summary = el('div', undefined, 'margin-bottom:20px;');
        summary.appendChild(el('div', tr.categoryPdfSummary, 'font-size:14px;font-weight:700;padding:6px 8px;background:#f1f5f9;border-radius:6px;'));
        summary.appendChild(row(['', groupBy === 'month' ? tr.pdfColMonth : tr.pdfColCategory, tr.pdfColTax, tr.pdfColTotal], 'font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;'));
        groups.forEach(g => {
          summary.appendChild(row(['', groupLabel(g.cat), formatCurrency(g.tax, lang, 2), formatCurrency(g.amount, lang, 2)], 'border-bottom:1px solid #f1f5f9;'));
        });
        summary.appendChild(row(['', tr.categoryPdfGrandTotal, formatCurrency(grandTax, lang, 2), formatCurrency(grandAmount, lang, 2)], 'font-size:14px;font-weight:700;border-top:2px solid #0f172a;padding-top:8px;'));
        if (grandEst > 0) {
          const nEst = expenses.filter(t => estTaxFor(t) > 0).length;
          summary.appendChild(el('p',
            tr.estTaxSummary.replace('{count}', String(nEst)).replace('{rate}', String(estRate)).replace('{amount}', formatCurrency(grandEst, lang, 2)),
            'margin-top:8px;font-size:11px;font-weight:600;color:#b45309;'));
          summary.appendChild(el('p', tr.estTaxLegend.replace('{rate}', String(estRate)), 'margin-top:2px;font-size:10px;color:#94a3b8;'));
        }
        summary.appendChild(el('p', tr.taxDisclaimer, 'margin-top:10px;font-size:10px;color:#94a3b8;line-height:1.5;'));
        root.appendChild(summary);
      }

      groups.forEach(g => {
        const block = el('div', undefined, 'margin-bottom:16px;');
        const catHead = el('div', groupLabel(g.cat), 'font-size:14px;font-weight:700;padding:6px 8px;background:#f1f5f9;border-radius:6px;page-break-after:avoid;');
        catHead.className = 'pdf-cat';
        block.appendChild(catHead);
        block.appendChild(row([tr.pdfColDate, tr.pdfColMerchant, tr.pdfColTax, tr.pdfColTotal], 'font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;'));
        g.txs.forEach(t => {
          block.appendChild(row([
            t.date,
            groupBy === 'month' ? `${t.merchant || t.description} [${catLabel(t.category)}]` : (t.merchant || t.description),
            t.taxAmount ? formatCurrency(t.taxAmount, lang, 2) : (estTaxFor(t) > 0 ? `~${formatCurrency(estTaxFor(t), lang, 2)}` : '—'),
            formatCurrency(t.amount, lang, 2),
          ], 'border-bottom:1px solid #f1f5f9;'));
        });
        block.appendChild(row(['', tr.categoryPdfSubtotal, formatCurrency(g.tax, lang, 2), formatCurrency(g.amount, lang, 2)], 'font-weight:700;padding-top:6px;'));
        root.appendChild(block);
      });

      document.body.appendChild(host);
      await html2pdfFn()
        .set({
          margin: 8,
          filename: `finsnap-expenses-by-${groupBy}-${fromDate || 'start'}_${toDate || 'end'}.pdf`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-row', '.pdf-cat'] },
        })
        .from(root)
        .save();
    } catch {
      // silently fall back, same as the other PDF button
    } finally {
      if (host && host.parentNode) host.parentNode.removeChild(host);
      setCategoryPdfLoading(false);
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
            <button onClick={onClose} title={tr.closeModal} aria-label={tr.closeModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Report period */}
          <div className="mb-4 bg-slate-50 rounded-2xl p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-500">{tr.taxPeriod}</div>
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              <button onClick={() => setRange(`${currentYear}-01-01`, `${currentYear}-12-31`)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700">{tr.taxPeriodYear}</button>
              {[1, 2, 3, 4].map(q => (
                <button key={q} onClick={() => setQuarter(q)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700">Q{q}</button>
              ))}
              <button onClick={setThisMonth} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700">{tr.taxPeriodMonth}</button>
            </div>
            <div className="grid grid-cols-2 gap-2" dir="ltr">
              <label className="text-[11px] text-slate-500">{tr.taxPeriodFrom}
                <input type="date" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800" />
              </label>
              <label className="text-[11px] text-slate-500">{tr.taxPeriodTo}
                <input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800" />
              </label>
            </div>
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
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{periodLabel}</div>
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
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{tr.transactionCount}</div>
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
                        <div className="text-xs text-slate-500">{tx.date} · {catLabel(tx.category)}</div>
                      </div>
                      <div className={`text-sm font-bold shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`} dir="ltr">
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, lang, 2)}
                      </div>
                    </div>
                    {!!tx.taxAmount && (
                      <div className="ml-5 mt-0.5 text-xs text-slate-400" dir="ltr">
                        {tr.taxInlineLabel} {formatCurrency(tx.taxAmount, lang, 2)}{tx.taxLabel ? ` (${tx.taxLabel})` : ''}
                      </div>
                    )}
                    {isUnitemized(tx) && (
                      <div className="ml-5 mt-0.5 text-xs italic text-slate-400">
                        {tr.taxNotItemized}
                      </div>
                    )}
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
                        {tx.receiptHash ? (
                          <button
                            onClick={() => handleViewReceipt(tx)}
                            disabled={loadingReceiptId === tx.id}
                            className="flex items-center gap-1 text-xs text-teal-600 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded-md font-medium transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            {loadingReceiptId === tx.id ? '…' : tr.receiptScanned}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">📎 {tr.receiptScanned}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{tr.totalTaxPaid}</span>
                  <span className="text-sm font-bold text-slate-800" dir="ltr">{formatCurrency(totalTax, lang, 2)}</span>
                </div>
                {unitemizedCount > 0 && (
                  <p className="text-xs text-amber-600 leading-relaxed">
                    {tr.taxUnitemizedNote
                      .replace('{count}', String(unitemizedCount))
                      .replace(/\{plural\}/g, unitemizedCount !== 1 ? 's' : '')}
                  </p>
                )}
                {unitemizedCount > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600">{tr.estTaxRateLabel}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={30}
                      step="0.1"
                      value={estRateText}
                      onChange={e => onEstRateChange(e.target.value)}
                      className="w-28 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white"
                      dir="ltr"
                    />
                    <p className="text-[11px] text-slate-400 leading-snug">{tr.estTaxRateHint}</p>
                    {totalEstTax > 0 && (
                      <p className="text-xs font-semibold text-amber-700" dir="ltr">
                        {tr.estTaxSummary
                          .replace('{count}', String(unitemizedCount))
                          .replace('{rate}', String(estRate))
                          .replace('{amount}', formatCurrency(totalEstTax, lang, 2))}
                      </p>
                    )}
                  </div>
                )}
                <div className="h-px bg-slate-200" />
                <p className="text-xs text-slate-400 leading-relaxed">{tr.taxLineExplainer}</p>
              </div>

              {categoryBreakdown.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{tr.taxByCategory}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-0.5">
                      <span>{tr.categoryColumn}</span>
                      <span dir="ltr">{tr.totalExpenses} · {tr.totalTaxPaid}</span>
                    </div>
                    {categoryBreakdown.map(([cat, sums]) => (
                      <div key={cat} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                        <span className="text-xs font-medium text-slate-700">{catLabel(cat)}</span>
                        <span className="text-xs font-semibold text-slate-600" dir="ltr">
                          {formatCurrency(sums.amount, lang, 2)} · {formatCurrency(sums.tax, lang, 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">{tr.taxDisclaimer}</p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {canExport ? (
              <>
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
                <button
                  onClick={() => handleDownloadAccountantPDF('category')}
                  disabled={categoryPdfLoading}
                  className="w-full py-3.5 bg-white border-2 border-slate-800 text-slate-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {categoryPdfLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : <FileDown className="w-4 h-4" />}
                  {tr.downloadCategoryPDF}
                </button>
                <button
                  onClick={() => handleDownloadAccountantPDF('month')}
                  disabled={categoryPdfLoading}
                  className="w-full py-3.5 bg-white border-2 border-slate-800 text-slate-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  <FileDown className="w-4 h-4" />
                  {tr.downloadMonthPDF}
                </button>
                <button onClick={handleDownloadExcel} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  {tr.downloadExcel}
                </button>
              </>
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
