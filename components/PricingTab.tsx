'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calculator, Sparkles, Save, Trash2, Package, Plus, ListPlus, Hash, LayoutGrid, ChevronDown } from 'lucide-react';
import { Lang, AccountType } from '@/lib/types';
import { BUSINESS_TEMPLATES, BusinessTemplate } from '@/lib/businessTemplates';

interface PricingTabProps {
  lang: Lang;
  accountType: AccountType;
}

type CostMode = 'single' | 'items';

interface CostItem {
  id: string;
  name: string;
  price: string;
}

// A single cost bucket the person defines themselves — e.g. "Materials",
// "Labor", "Packaging", "Travel", "Software"... whatever fits their work.
// This is intentionally NOT tied to any business type (product/service/
// trade): the person names it, so it works for a candle maker, a plumber,
// a designer, or anything else without us guessing their industry.
interface CostCategory {
  id: string;
  name: string;
  mode: CostMode;
  single: string;
  items: CostItem[];
}

interface SavedCategorySnapshot {
  name: string;
  total: number;
}

interface SavedProduct {
  id: string;
  name: string;
  categories: SavedCategorySnapshot[];
  quantity: number;
  marginPct: number;
  createdAt: number;
}

const STORAGE_KEY = 'finsnap_pricing_v2';

const LABELS = {
  EN: {
    title: '💰 Pricing & Profit Estimator',
    subtitle: 'Add whatever cost categories fit your work — materials, labor, packaging, travel, tools, anything — then get a smart suggested selling price.',
    costSection: 'Step 1 · Cost Breakdown',
    productName: 'Name',
    productNamePlaceholder: 'e.g. Handmade candle, Logo design, Sink repair...',
    categoryNamePlaceholder: 'e.g. Materials, Labor, Packaging, Travel...',
    addCategory: '+ Add Cost Category',
    removeCategory: 'Remove category',
    quantity: 'Quantity (units, clients, or jobs)',
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
    templatesButton: 'Start from a business template',
    templatesHint: 'Pick your type of business to prefill typical monthly cost categories — edit any amount after.',
    templateOther: "My business isn't listed",
    pricingBasisLabel: 'How do you price this?',
    basisQuantity: 'Per unit',
    basisWeight: 'Per weight',
    basisHour: 'Per hour',
    basisProject: 'Per project (fixed job)',
    basisArea: 'Per area (sq ft/m²)',
    batchWeightLabel: 'Total batch weight (whole recipe/production run)',
    unitWeightLabel: 'Weight of one unit you sell',
    weightYields: 'This batch yields',
    weightUnitsLabel: 'sellable units',
    hoursLabel: 'Hours worked (this job/period)',
    areaLabel: 'Total area (sq ft or m²)',
    projectNote: 'Total cost = the full project price. Quantity is fixed at 1.',
  },
  FA: {
    title: '💰 محاسبه‌گر قیمت‌گذاری و سود',
    subtitle: 'هر دسته‌ی هزینه‌ای که با کارت جور در میاد اضافه کن — مواد، دستمزد، بسته‌بندی، رفت‌وآمد، ابزار، هرچی — بعد قیمت فروش پیشنهادی هوشمند بگیر.',
    costSection: 'مرحله ۱ · محاسبه هزینه‌ها',
    productName: 'نام',
    productNamePlaceholder: 'مثلاً شمع دست‌ساز، طراحی لوگو، تعمیر سینک...',
    categoryNamePlaceholder: 'مثلاً مواد اولیه، دستمزد، بسته‌بندی، رفت‌وآمد...',
    addCategory: '+ افزودن دسته‌ی هزینه',
    removeCategory: 'حذف دسته',
    quantity: 'تعداد (واحد، مشتری، یا سرویس)',
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
    templatesButton: 'شروع از یک قالب کسب‌وکار',
    templatesHint: 'نوع کسب‌وکارت رو انتخاب کن تا دسته‌های هزینه‌ی معمول ماهانه از قبل پر بشن — بعداً هر مبلغی رو می‌تونی ویرایش کنی.',
    templateOther: 'کسب‌وکار من توی لیست نیست',
    pricingBasisLabel: 'قیمت‌گذاری بر چه اساسیه؟',
    basisQuantity: 'بر اساس تعداد',
    basisWeight: 'بر اساس وزن',
    basisHour: 'بر اساس ساعت',
    basisProject: 'بر اساس پروژه (مبلغ ثابت)',
    basisArea: 'بر اساس متراژ',
    batchWeightLabel: 'وزن کل دستور/تولید (کل بچ)',
    unitWeightLabel: 'وزن هر واحدی که می‌فروشی',
    weightYields: 'این مقدار تولید می‌کنه:',
    weightUnitsLabel: 'واحد قابل‌فروش',
    hoursLabel: 'ساعت کار (این پروژه/دوره)',
    areaLabel: 'مساحت کل (متر مربع یا فوت مربع)',
    projectNote: 'مجموع هزینه = کل قیمت پروژه. تعداد روی ۱ ثابته.',
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

function newCategory(): CostCategory {
  return { id: generateId(), name: '', mode: 'single', single: '', items: [] };
}

function categoryTotal(c: CostCategory) {
  if (c.mode === 'single') return num(c.single);
  return c.items.reduce((s, it) => s + num(it.price), 0);
}

// One free-form cost bucket: an editable name (so it can be "Materials",
// "Labor", "Travel", or anything else) plus a value that can be either a
// single total or an item-by-item breakdown.
function CostCategoryEditor({
  labels,
  isRtl,
  category,
  onChange,
  onRemove,
  canRemove,
}: {
  labels: typeof LABELS.EN;
  isRtl: boolean;
  category: CostCategory;
  onChange: (next: CostCategory) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const inputClass = 'w-full py-2.5 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  const addItem = () => {
    onChange({ ...category, items: [...category.items, { id: generateId(), name: '', price: '' }] });
  };
  const updateItem = (id: string, patch: Partial<CostItem>) => {
    onChange({ ...category, items: category.items.map(it => (it.id === id ? { ...it, ...patch } : it)) });
  };
  const removeItem = (id: string) => {
    onChange({ ...category, items: category.items.filter(it => it.id !== id) });
  };

  return (
    <div className="border border-slate-100 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          value={category.name}
          onChange={e => onChange({ ...category, name: e.target.value })}
          placeholder={labels.categoryNamePlaceholder}
          className={`${inputClass} flex-1 font-semibold`}
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            title={labels.removeCategory}
            className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex justify-end mb-2">
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...category, mode: 'single' })}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${category.mode === 'single' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            <Hash className="w-3 h-3" />
            {labels.modeSingle}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...category, mode: 'items', items: category.items.length ? category.items : [{ id: generateId(), name: '', price: '' }] })}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${category.mode === 'items' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
          >
            <ListPlus className="w-3 h-3" />
            {labels.modeItems}
          </button>
        </div>
      </div>

      {category.mode === 'single' ? (
        <input
          type="number"
          min="0"
          step="0.01"
          value={category.single}
          onChange={e => onChange({ ...category, single: e.target.value })}
          placeholder="0.00"
          className={inputClass}
          dir="ltr"
        />
      ) : (
        <div className="space-y-2">
          {category.items.length === 0 && <p className="text-[11px] text-slate-400">{labels.noItemsYet}</p>}
          {category.items.map(it => (
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
            <span className="font-bold text-slate-800" dir="ltr">{fmt(categoryTotal(category))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingTab({ lang, accountType }: PricingTabProps) {
  const isRtl = lang === 'FA';
  const L = isRtl ? LABELS.FA : LABELS.EN;

  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CostCategory[]>(() => [newCategory(), newCategory()]);
  const [quantity, setQuantity] = useState('1');
  type PricingBasis = 'quantity' | 'weight' | 'hour' | 'project' | 'area';
  const [pricingBasis, setPricingBasis] = useState<PricingBasis>('quantity');
  // Weight mode needs two numbers (how much the whole batch makes vs. how
  // big one sellable unit is) to derive an effective quantity; hour/area
  // modes just need one continuous number; project mode has no input at
  // all — its quantity is always exactly 1 (total cost = total price).
  const [batchWeight, setBatchWeight] = useState('');
  const [unitWeight, setUnitWeight] = useState('');
  const [hoursOrArea, setHoursOrArea] = useState('');
  const [marginPct, setMarginPct] = useState('30');
  const [saved, setSaved] = useState<SavedProduct[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  // Snapshot of `categories` exactly as it looked right after the most
  // recently applied template — used to detect whether the person has
  // touched anything since. `null` once they edit something (or before
  // any template has ever been applied).
  const [lastTemplateSnapshot, setLastTemplateSnapshot] = useState<string | null>(null);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  const updateCategory = (id: string, next: CostCategory) => {
    setCategories(prev => prev.map(c => (c.id === id ? next : c)));
    setLastTemplateSnapshot(null);
  };
  const addCategory = () => {
    setCategories(prev => [...prev, newCategory()]);
    setLastTemplateSnapshot(null);
  };
  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setLastTemplateSnapshot(null);
  };

  // Applying a template prefills typical monthly cost categories for the
  // chosen business type.
  //
  // If nothing has been edited since the last template was applied (i.e.
  // `categories` still matches `lastTemplateSnapshot` exactly), picking a
  // different template REPLACES the previous one wholesale — otherwise,
  // switching templates while just browsing would silently leave the old
  // template's categories sitting there untouched.
  //
  // Once the person has actually changed something (edited an amount,
  // renamed a category, added/removed one), `lastTemplateSnapshot` is
  // null and we fall back to merging: keep everything they've filled in,
  // and only add the new template's items that don't already match an
  // existing category name.
  const handleApplyTemplate = (template: BusinessTemplate) => {
    setCategories(prev => {
      const untouchedSinceLastTemplate =
        lastTemplateSnapshot !== null && JSON.stringify(prev) === lastTemplateSnapshot;

      const base = untouchedSinceLastTemplate ? [] : prev;
      const kept = base.filter(c => c.name.trim() !== '' || c.single.trim() !== '' || c.items.length > 0);
      const existingNames = new Set(kept.map(c => c.name.trim().toLowerCase()));
      const additions: CostCategory[] = [];

      if (template.recipeCategories) {
        // Per-batch ingredient/cost breakdown (item-by-item mode) — the
        // right shape for costing a single product, unlike `items` below
        // which is a monthly overhead figure.
        template.recipeCategories.forEach(cat => {
          const label = cat.name[lang] || cat.name.EN;
          if (existingNames.has(label.trim().toLowerCase())) return;
          existingNames.add(label.trim().toLowerCase());
          additions.push({
            ...newCategory(),
            name: label,
            mode: 'items',
            items: cat.items.map(it => ({ id: generateId(), name: it.name[lang] || it.name.EN, price: String(it.price) })),
          });
        });
      } else {
        template.items.forEach(item => {
          const label = item.label[lang] || item.label.EN;
          if (existingNames.has(label.trim().toLowerCase())) return;
          existingNames.add(label.trim().toLowerCase());
          additions.push({ ...newCategory(), name: label, single: String(item.amount) });
        });
      }

      const next = [...kept, ...additions];
      setLastTemplateSnapshot(JSON.stringify(next));
      return next;
    });
    if (!name.trim()) setName(template.name[lang] || template.name.EN);
    if (template.defaultPricingBasis) setPricingBasis(template.defaultPricingBasis);
    setShowTemplates(false);
  };

  // How many "sellable units" the batch/project/job amounts to, depending
  // on the chosen pricing basis. This is the ONLY thing that changes per
  // basis — once we have this number, the cost/margin math below is
  // identical for all five modes.
  const effectiveQty = useMemo(() => {
    switch (pricingBasis) {
      case 'weight': {
        const batch = num(batchWeight);
        const unit = num(unitWeight);
        if (batch <= 0 || unit <= 0) return 0;
        return batch / unit;
      }
      case 'hour':
      case 'area':
        return Math.max(0, num(hoursOrArea));
      case 'project':
        return 1;
      case 'quantity':
      default:
        return Math.max(1, Math.round(num(quantity)) || 1);
    }
  }, [pricingBasis, quantity, batchWeight, unitWeight, hoursOrArea]);

  const calc = useMemo(() => {
    const qty = effectiveQty > 0 ? effectiveQty : 1;
    const margin = Math.min(95, Math.max(0, num(marginPct)));

    const totalCost = categories.reduce((s, c) => s + categoryTotal(c), 0);
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
  }, [categories, effectiveQty, marginPct]);

  const handleSave = () => {
    const entry: SavedProduct = {
      id: generateId(),
      name: name.trim() || (isRtl ? 'مورد بدون نام' : 'Untitled item'),
      categories: categories
        .filter(c => categoryTotal(c) > 0 || c.name.trim())
        .map(c => ({ name: c.name.trim() || (isRtl ? 'بدون‌نام' : 'Unnamed'), total: categoryTotal(c) })),
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

          {accountType === 'business' && (
            <div>
              <button
                type="button"
                onClick={() => setShowTemplates(s => !s)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-all"
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  {L.templatesButton}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
              </button>

              {showTemplates && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400 mb-3">{L.templatesHint}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BUSINESS_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleApplyTemplate(template)}
                        className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                      >
                        <span className="text-lg shrink-0">{template.icon}</span>
                        <span className="text-xs font-medium text-slate-700 leading-tight">{template.name[lang] || template.name.EN}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowTemplates(false)}
                      className="flex items-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                    >
                      <span className="text-lg shrink-0">✏️</span>
                      <span className="text-xs font-medium text-slate-700 leading-tight">{L.templateOther}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {categories.map(c => (
            <CostCategoryEditor
              key={c.id}
              labels={L}
              isRtl={isRtl}
              category={c}
              onChange={next => updateCategory(c.id, next)}
              onRemove={() => removeCategory(c.id)}
              canRemove={categories.length > 1}
            />
          ))}

          <button
            type="button"
            onClick={addCategory}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 text-xs font-semibold rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {L.addCategory}
          </button>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{L.pricingBasisLabel}</label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {([
                ['quantity', L.basisQuantity],
                ['weight', L.basisWeight],
                ['hour', L.basisHour],
                ['area', L.basisArea],
                ['project', L.basisProject],
              ] as [PricingBasis, string][]).map(([basis, label]) => (
                <button
                  key={basis}
                  type="button"
                  onClick={() => setPricingBasis(basis)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${pricingBasis === basis ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {pricingBasis === 'quantity' && (
              <input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} dir="ltr" placeholder={L.quantity} />
            )}

            {pricingBasis === 'weight' && (
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">{L.batchWeightLabel}</label>
                  <input type="number" min="0" step="any" value={batchWeight} onChange={e => setBatchWeight(e.target.value)} className={inputClass} dir="ltr" placeholder="e.g. 2000 (g)" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">{L.unitWeightLabel}</label>
                  <input type="number" min="0" step="any" value={unitWeight} onChange={e => setUnitWeight(e.target.value)} className={inputClass} dir="ltr" placeholder="e.g. 500 (g)" />
                </div>
                {effectiveQty > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold">
                    {L.weightYields} {effectiveQty.toLocaleString(undefined, { maximumFractionDigits: 1 })} {L.weightUnitsLabel}
                  </p>
                )}
              </div>
            )}

            {(pricingBasis === 'hour' || pricingBasis === 'area') && (
              <input
                type="number" min="0" step="any"
                value={hoursOrArea}
                onChange={e => setHoursOrArea(e.target.value)}
                className={inputClass}
                dir="ltr"
                placeholder={pricingBasis === 'hour' ? L.hoursLabel : L.areaLabel}
              />
            )}

            {pricingBasis === 'project' && (
              <p className="text-[11px] text-slate-400 italic">{L.projectNote}</p>
            )}
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

      {/* Saved items */}
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
              const totalCost = p.categories.reduce((s, c) => s + c.total, 0);
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
