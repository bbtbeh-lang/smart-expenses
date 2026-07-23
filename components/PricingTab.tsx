'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calculator, Sparkles, Save, Trash2, Package } from 'lucide-react';
import { Lang } from '@/lib/types';

interface PricingTabProps {
  lang: Lang;
}

interface SavedProduct {
  id: string;
  name: string;
  materialCost: number;
  packagingCost: number;
  otherCost: number;
  quantity: number;
  marginPct: number;
  createdAt: number;
}

const STORAGE_KEY = 'finsnap_pricing_v1';

const LABELS = {
  EN: {
    title: '💰 Pricing & Profit Estimator',
    subtitle: 'Work out what a product or order really costs you, then get a smart suggested selling price.',
    costSection: 'Step 1 · Cost Breakdown',
    productName: 'Product / Order Name',
    productNamePlaceholder: 'e.g. Handmade candle - large',
    materialCost: 'Materials / Ingredients Cost',
    packagingCost: 'Packaging Cost',
    otherCost: 'Other Costs (labor, shipping, fees...)',
    quantity: 'Units Produced (batch size)',
    totalCost: 'Total Cost',
    costPerUnit: 'Cost per Unit',
    priceSection: 'Step 2 · Smart Price Recommender',
    marginLabel: 'Desired Profit Margin',
    suggestedPrice: 'Suggested Selling Price (per unit)',
    netProfit: 'Net Profit (per unit)',
    profitMargin: 'Profit Margin',
    markup: 'Markup on Cost',
    batchSummary: 'Batch Summary',
    totalRevenue: 'Total Revenue',
    totalProfit: 'Total Profit',
    save: 'Save This Product',
    saved: 'Saved Products',
    noSaved: 'No saved products yet. Fill in the numbers above and save your first one.',
    delete: 'Delete',
    perUnit: 'per unit',
  },
  FA: {
    title: '💰 محاسبه‌گر قیمت‌گذاری و سود',
    subtitle: 'هزینه‌ی واقعی هر محصول یا سفارش را محاسبه کن و قیمت فروش پیشنهادی هوشمند دریافت کن.',
    costSection: 'مرحله ۱ · محاسبه هزینه‌ها',
    productName: 'نام محصول / سفارش',
    productNamePlaceholder: 'مثلاً شمع دست‌ساز - بزرگ',
    materialCost: 'هزینه مواد اولیه',
    packagingCost: 'هزینه بسته‌بندی',
    otherCost: 'سایر هزینه‌ها (دستمزد، ارسال، کارمزد...)',
    quantity: 'تعداد تولید شده (اندازه دسته)',
    totalCost: 'مجموع هزینه',
    costPerUnit: 'هزینه هر واحد',
    priceSection: 'مرحله ۲ · پیشنهاد هوشمند قیمت',
    marginLabel: 'درصد سود مورد نظر',
    suggestedPrice: 'قیمت فروش پیشنهادی (هر واحد)',
    netProfit: 'سود خالص (هر واحد)',
    profitMargin: 'حاشیه سود',
    markup: 'نرخ افزایش نسبت به هزینه',
    batchSummary: 'خلاصه کل دسته',
    totalRevenue: 'مجموع درآمد',
    totalProfit: 'مجموع سود',
    save: 'ذخیره این محصول',
    saved: 'محصولات ذخیره‌شده',
    noSaved: 'هنوز محصولی ذخیره نشده. اعداد بالا را وارد کن و اولین مورد را ذخیره کن.',
    delete: 'حذف',
    perUnit: 'به ازای هر واحد',
  },
};

function loadSaved(): SavedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistSaved(products: SavedProduct[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {}
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function PricingTab({ lang }: PricingTabProps) {
  const isRtl = lang === 'FA';
  const L = isRtl ? LABELS.FA : LABELS.EN;

  const [name, setName] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [marginPct, setMarginPct] = useState('30');
  const [saved, setSaved] = useState<SavedProduct[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  const num = (s: string) => {
    const v = parseFloat(s);
    return isNaN(v) || v < 0 ? 0 : v;
  };

  const calc = useMemo(() => {
    const material = num(materialCost);
    const packaging = num(packagingCost);
    const other = num(otherCost);
    const qty = Math.max(1, Math.round(num(quantity)) || 1);
    const margin = Math.min(95, Math.max(0, num(marginPct)));

    const totalCost = material + packaging + other;
    const costPerUnit = totalCost / qty;

    // Margin here is defined as % of the SELLING PRICE (standard "profit margin"),
    // not % of cost — that's why price = cost / (1 - margin), not cost * (1 + margin).
    const suggestedPrice = margin >= 95 ? costPerUnit : costPerUnit / (1 - margin / 100);
    const netProfitPerUnit = suggestedPrice - costPerUnit;
    const actualMarginPct = suggestedPrice > 0 ? (netProfitPerUnit / suggestedPrice) * 100 : 0;
    const markupPct = costPerUnit > 0 ? (netProfitPerUnit / costPerUnit) * 100 : 0;

    return {
      totalCost,
      costPerUnit,
      qty,
      suggestedPrice,
      netProfitPerUnit,
      actualMarginPct,
      markupPct,
      totalRevenue: suggestedPrice * qty,
      totalProfit: netProfitPerUnit * qty,
    };
  }, [materialCost, packagingCost, otherCost, quantity, marginPct]);

  const handleSave = () => {
    const entry: SavedProduct = {
      id: generateId(),
      name: name.trim() || (isRtl ? 'محصول بدون نام' : 'Untitled product'),
      materialCost: num(materialCost),
      packagingCost: num(packagingCost),
      otherCost: num(otherCost),
      quantity: calc.qty,
      marginPct: num(marginPct),
      createdAt: Date.now(),
    };
    const next = [entry, ...saved];
    setSaved(next);
    persistSaved(next);
  };

  const handleDelete = (id: string) => {
    const next = saved.filter(p => p.id !== id);
    setSaved(next);
    persistSaved(next);
  };

  const inputClass = 'w-full py-2.5 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';

  return (
    <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      <h2 className="text-xl font-bold text-slate-900 mb-1">{L.title}</h2>
      <p className="text-xs text-slate-500 mb-4">{L.subtitle}</p>

      {/* Step 1: Cost breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-emerald-600" />
          {L.costSection}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{L.productName}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={L.productNamePlaceholder} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{L.materialCost}</label>
            <input type="number" min="0" step="0.01" value={materialCost} onChange={e => setMaterialCost(e.target.value)} placeholder="0.00" className={inputClass} dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{L.packagingCost}</label>
            <input type="number" min="0" step="0.01" value={packagingCost} onChange={e => setPackagingCost(e.target.value)} placeholder="0.00" className={inputClass} dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{L.otherCost}</label>
            <input type="number" min="0" step="0.01" value={otherCost} onChange={e => setOtherCost(e.target.value)} placeholder="0.00" className={inputClass} dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{L.quantity}</label>
            <input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} dir="ltr" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">{L.totalCost}</p>
            <p className="text-sm font-bold text-slate-800" dir="ltr">{fmt(calc.totalCost)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">{L.costPerUnit}</p>
            <p className="text-sm font-bold text-slate-800" dir="ltr">{fmt(calc.costPerUnit)}</p>
          </div>
        </div>
      </div>

      {/* Step 2: Smart price recommender */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          {L.priceSection}
        </h3>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-600">{L.marginLabel}</label>
            <span className="text-xs font-bold text-emerald-600" dir="ltr">{num(marginPct)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="1"
            value={num(marginPct)}
            onChange={e => setMarginPct(e.target.value)}
            className="w-full accent-emerald-500"
          />
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 mb-3 text-white">
          <p className="text-[10px] font-semibold uppercase opacity-80 mb-0.5">{L.suggestedPrice}</p>
          <p className="text-2xl font-bold" dir="ltr">{fmt(calc.suggestedPrice)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-indigo-600 uppercase mb-0.5">{L.netProfit}</p>
            <p className="text-sm font-bold text-indigo-700" dir="ltr">{fmt(calc.netProfitPerUnit)}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-indigo-600 uppercase mb-0.5">{L.profitMargin}</p>
            <p className="text-sm font-bold text-indigo-700" dir="ltr">{calc.actualMarginPct.toFixed(1)}%</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 col-span-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">{L.markup}</p>
            <p className="text-sm font-bold text-slate-800" dir="ltr">{calc.markupPct.toFixed(1)}%</p>
          </div>
        </div>

        {calc.qty > 1 && (
          <div className="border-t border-slate-100 pt-3 mb-3">
            <p className="text-xs font-bold text-slate-700 mb-2">{L.batchSummary} ({calc.qty} {L.perUnit})</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-0.5">{L.totalRevenue}</p>
                <p className="text-sm font-bold text-emerald-700" dir="ltr">{fmt(calc.totalRevenue)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-0.5">{L.totalProfit}</p>
                <p className="text-sm font-bold text-emerald-700" dir="ltr">{fmt(calc.totalProfit)}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          {L.save}
        </button>
      </div>

      {/* Saved products */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" />
            {L.saved} {saved.length > 0 && `(${saved.length})`}
          </h3>
        </div>
        {saved.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{L.noSaved}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {saved.map(p => {
              const totalCost = p.materialCost + p.packagingCost + p.otherCost;
              const costPerUnit = totalCost / p.quantity;
              const margin = Math.min(95, Math.max(0, p.marginPct));
              const price = margin >= 95 ? costPerUnit : costPerUnit / (1 - margin / 100);
              const profit = price - costPerUnit;
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400" dir="ltr">
                      {L.costPerUnit}: {fmt(costPerUnit)} · {L.suggestedPrice.split('(')[0].trim()}: {fmt(price)} · {L.netProfit.split('(')[0].trim()}: {fmt(profit)}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
