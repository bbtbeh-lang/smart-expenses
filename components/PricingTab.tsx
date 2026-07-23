'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calculator, Sparkles, Save, Trash2, Package, Plus, ListPlus, Hash } from 'lucide-react';
import { Lang } from '@/lib/types';

interface PricingTabProps {
  lang: Lang;
}

type OfferingType = 'product' | 'service';
type CostMode = 'single' | 'items';

interface CostItem {
  id: string;
  name: string;
  price: string;
}

interface CostFieldState {
  mode: CostMode;
  single: string;
  items: CostItem[];
}

interface SavedProduct {
  id: string;
  name: string;
  offeringType: OfferingType;
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
    subtitle: 'Work out what something really costs you, then get a smart suggested selling price.',
    offeringLabel: 'What are you pricing?',
    offeringProduct: 'Physical Product',
    offeringService: 'Service / Freelance Work',
    costSection: 'Step 1 · Cost Breakdown',
    productName: 'Name',
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
    save: 'Save This',
    saved: 'Saved Items',
    noSaved: 'Nothing saved yet. Fill in the numbers above and save your first one.',
    delete: 'Delete',
    perUnit: 'per unit',
    modeSingle: 'One total',
    modeItems: 'Item by item',
    itemName: 'Item name',
    itemPrice: 'Price',
    addItem: 'Add item',
    subtotal: 'Subtotal',
    noItemsYet: 'No items added yet.',
  },
  FA: {
    title: '💰 محاسبه‌گر قیمت‌گذاری و سود',
    subtitle: 'هزینه‌ی واقعی چیزی که می‌فروشی را محاسبه کن و قیمت فروش پیشنهادی هوشمند دریافت کن.',
    offeringLabel: 'داری برای چی قیمت‌گذاری می‌کنی؟',
    offeringProduct: 'محصول فیزیکی',
    offeringService: 'خدمات / کار فریلنسری',
    costSection: 'مرحله ۱ · محاسبه هزینه‌ها',
    productName: 'نام',
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
    save: 'ذخیره',
    saved: 'موارد ذخیره‌شده',
    noSaved: 'هنوز چیزی ذخیره نشده. اعداد بالا را وارد کن و اولین مورد را ذخیره کن.',
    delete: 'حذف',
    perUnit: 'به ازای هر واحد',
    modeSingle: 'یک عدد کلی',
    modeItems: 'مورد به مورد',
    itemName: 'نام مورد',
    itemPrice: 'قیمت',
    addItem: '+ افزودن مورد',
    subtotal: 'جمع جزء',
    noItemsYet: 'هنوز موردی اضافه نشده.',
  },
};

// Field labels/placeholders that change depending on whether the person is
// pricing a physical product (materials, packaging...) or a service /
// freelance job (time, tools...). Everything else in LABELS stays generic.
const TYPE_LABELS = {
  EN: {
    product: {
      namePlaceholder: 'e.g. Handmade candle - large',
      cost1: 'Materials / Ingredients Cost',
      cost2: 'Packaging Cost',
      cost3: 'Other Costs (labor, shipping, fees...)',
      quantity: 'Units Produced (batch size)',
    },
    service: {
      namePlaceholder: 'e.g. Logo design package',
      cost1: 'Time & Labor Cost',
      cost2: 'Tools / Software / Subscriptions',
      cost3: 'Other Costs (travel, fees...)',
      quantity: 'Number of Clients / Projects',
    },
  },
  FA: {
    product: {
      namePlaceholder: 'مثلاً شمع دست‌ساز - بزرگ',
      cost1: 'هزینه مواد اولیه',
      cost2: 'هزینه بسته‌بندی',
      cost3: 'سایر هزینه‌ها (دستمزد، ارسال، کارمزد...)',
      quantity: 'تعداد تولید شده (اندازه دسته)',
    },
    service: {
      namePlaceholder: 'مثلاً پکیج طراحی لوگو',
      cost1: 'هزینه زمان و دستمزد',
      cost2: 'ابزار / نرم‌افزار / اشتراک‌ها',
      cost3: 'سایر هزینه‌ها (رفت‌وآمد، کارمزد...)',
      quantity: 'تعداد مشتری / پروژه',
    },
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

function num(s: string) {
  const v = parseFloat(s);
  return isNaN(v) || v < 0 ? 0 : v;
}

function emptyCostField(): CostFieldState {
  return { mode: 'single', single: '', items: [] };
}

function costFieldTotal(f: CostFieldState) {
  if (f.mode === 'single') return num(f.single);
  return f.items.reduce((s, it) => s + num(it.price), 0);
}

// A cost input that can be toggled between "one total number" and
// "item by item" (add a row per ingredient/material/fee, auto-summed).
function CostFieldEditor({
  label,
  labels,
  isRtl,
  state,
  onChange,
}: {
  label: string;
  labels: typeof LABELS.EN;
  isRtl: boolean;
  state: CostFieldState;
  onChange: (next: CostFieldState) => void;
}) {
  const inputClass = 'w-full py-2.5 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  const addItem = () => {
    onChange({ ...state, items: [...state.items, { id: generateId(), name: '', price: '' }] });
  };
  const updateItem = (id: string, patch: Partial<CostItem>) => {
    onChange({ ...state, items: state.items.map(it => (it.id === id ? { ...it, ...patch } : it)) });
  };
  const removeItem = (id: string) => {
    onChange({ ...state, items: state.items.filter(it => it.id !== id) });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-slate-600">{label}</label>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...state, mode: 'single' })}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${state.mode === 'single' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            <Hash className="w-3 h-3" />
            {labels.modeSingle}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...state, mode: 'items', items: state.items.length ? state.items : [{ id: generateId(), name: '', price: '' }] })}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${state.mode === 'items' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            <ListPlus className="w-3 h-3" />
            {labels.modeItems}
          </button>
        </div>
      </div>

      {state.mode === 'single' ? (
        <input
          type="number"
          min="0"
          step="0.01"
          value={state.single}
          onChange={e => onChange({ ...state, single: e.target.value })}
          placeholder="0.00"
          className={inputClass}
          dir="ltr"
        />
      ) : (
        <div className="space-y-2">
          {state.items.length === 0 && <p className="text-[11px] text-slate-400">{labels.noItemsYet}</p>}
          {state.items.map(it => (
            <div key={it.id} className="flex items-center gap-2">
              <input
                value={it.name}
                onChange={e => updateItem(it.id, { name: e.target.value })}
                placeholder={labels.itemName}
                className={`${inputClass} flex-1`}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={it.price}
                onChange={e => updateItem(it.id, { price: e.target.value })}
                placeholder={labels.itemPrice}
                className={`${inputClass} w-24`}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                className="text-slate-300 hover:text-rose-500 transition-colors p-1 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {labels.addItem}
          </button>
          <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">{labels.subtotal}</span>
            <span className="font-bold text-slate-800" dir="ltr">{fmt(costFieldTotal(state))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingTab({ lang }: PricingTabProps) {
  const isRtl = lang === 'FA';
  const L = isRtl ? LABELS.FA : LABELS.EN;

  const [offeringType, setOfferingType] = useState<OfferingType>('product');
  const FL = (isRtl ? TYPE_LABELS.FA : TYPE_LABELS.EN)[offeringType];
  const [name, setName] = useState('');
  const [material, setMaterial] = useState<CostFieldState>(emptyCostField);
  const [packaging, setPackaging] = useState<CostFieldState>(emptyCostField);
  const [other, setOther] = useState<CostFieldState>(emptyCostField);
  const [quantity, setQuantity] = useState('1');
  const [marginPct, setMarginPct] = useState('30');
  const [saved, setSaved] = useState<SavedProduct[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  const calc = useMemo(() => {
    const materialTotal = costFieldTotal(material);
    const packagingTotal = costFieldTotal(packaging);
    const otherTotal = costFieldTotal(other);
    const qty = Math.max(1, Math.round(num(quantity)) || 1);
    const margin = Math.min(95, Math.max(0, num(marginPct)));

    const totalCost = materialTotal + packagingTotal + otherTotal;
    const costPerUnit = totalCost / qty;

    // Margin here is defined as % of the SELLING PRICE (standard "profit margin"),
    // not % of cost — that's why price = cost / (1 - margin), not cost * (1 + margin).
    const suggestedPrice = margin >= 95 ? costPerUnit : costPerUnit / (1 - margin / 100);
    const netProfitPerUnit = suggestedPrice - costPerUnit;
    const actualMarginPct = suggestedPrice > 0 ? (netProfitPerUnit / suggestedPrice) * 100 : 0;
    const markupPct = costPerUnit > 0 ? (netProfitPerUnit / costPerUnit) * 100 : 0;

    return {
      materialTotal,
      packagingTotal,
      otherTotal,
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
  }, [material, packaging, other, quantity, marginPct]);

  const handleSave = () => {
    const entry: SavedProduct = {
      id: generateId(),
      name: name.trim() || (isRtl ? 'مورد بدون نام' : 'Untitled item'),
      offeringType,
      materialCost: calc.materialTotal,
      packagingCost: calc.packagingTotal,
      otherCost: calc.otherTotal,
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

      {/* Offering type: physical product vs service/freelance work — changes the wording below */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{L.offeringLabel}</label>
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
          {(['product', 'service'] as OfferingType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setOfferingType(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                offeringType === t ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              {t === 'product' ? L.offeringProduct : L.offeringService}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Cost breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-emerald-600" />
          {L.costSection}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{L.productName}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={FL.namePlaceholder} className={inputClass} />
          </div>

          <CostFieldEditor label={FL.cost1} labels={L} isRtl={isRtl} state={material} onChange={setMaterial} />
          <CostFieldEditor label={FL.cost2} labels={L} isRtl={isRtl} state={packaging} onChange={setPackaging} />
          <CostFieldEditor label={FL.cost3} labels={L} isRtl={isRtl} state={other} onChange={setOther} />

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{FL.quantity}</label>
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
