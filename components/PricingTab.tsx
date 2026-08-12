'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calculator, Sparkles, Save, Trash2, Package, Plus, ListPlus, Hash,
  LayoutGrid, ChevronDown, PenSquare, RotateCcw, ShieldAlert, Info, Target,
} from 'lucide-react';
import { Lang, AccountType } from '@/lib/types';
import { BUSINESS_TEMPLATES, BusinessTemplate } from '@/lib/businessTemplates';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

interface PricingTabProps {
  lang: Lang;
  accountType: AccountType;
}

type CostMode = 'single' | 'items';
type PricingBasis = 'quantity' | 'weight' | 'hour' | 'project' | 'area';

interface CostItem {
  id: string;
  name: string;
  price: string;
  // 'flat' (default, omitted for backward compat with saved data): price
  // is a fixed dollar amount per unit. 'percent': price is a percentage
  // of the final selling price (e.g. "2.5" = 2.5%) — used for costs that
  // are genuinely proportional to what's charged, like card-processing
  // fees or self-employment contributions, instead of guessing a dollar
  // figure off an assumed price point. Resolved in the price formula
  // below rather than summed as a flat dollar amount.
  kind?: 'flat' | 'percent';
}

// A single cost bucket the person defines themselves — e.g. "Materials",
// "Labor", "Packaging", "Travel", "Software"... whatever fits their work.
// This is intentionally NOT tied to any business type (product/service/
// trade): the person names it, so it works for a candle maker, a plumber,
// a designer, or anything else without us guessing their industry.
// Fixed grouping used ONLY for categories that came from a business
// template's `recipeCategories` (see businessTemplates.ts), or from the
// "Suggest hidden costs" shortcut: every template's per-batch breakdown
// follows the same 3-part shape — direct consumables, then supplies/
// equipment, then hidden/overhead costs — so we can label each one
// automatically without the person typing anything. Categories the
// person adds themselves have no group and render exactly as before
// (free-form, no header).
type RecipeGroup = 'direct' | 'supplies' | 'hidden';

interface CostCategory {
  id: string;
  name: string;
  mode: CostMode;
  single: string;
  items: CostItem[];
  group?: RecipeGroup;
  // Only meaningful for the 'hidden' group category: overhead (electricity
  // share, equipment depreciation, unbillable time, rent share, etc.) as
  // a percentage of direct costs, instead of asking the person to guess a
  // dollar figure for each one individually. Standard small-business
  // practice — nobody actually meters "how much electricity did this one
  // dish use". Resolved against direct+supplies flat totals in `calc`.
  overheadPct?: string;
}

// A full saved record. Unlike the old schema (which only kept a
// name+total snapshot per category), this stores everything needed to
// load the record straight back into the form for editing — the exact
// categories/items, the pricing basis, and every input that feeds it.
interface SavedProduct {
  id: string;
  name: string;
  categories: CostCategory[];
  pricingBasis: PricingBasis;
  quantity: string;
  batchWeight: string;
  unitWeight: string;
  hoursOrArea: string;
  marginPct: string;
  createdAt: number;
  updatedAt?: number;
  // Which business template (if any) this product was priced under —
  // shown as a badge in the saved-items list so several products under
  // the same business type are easy to tell apart from products under a
  // different one. Undefined for products built without a template.
  templateName?: string;
  // Stable id of that same template (e.g. "restaurant"), used to look up
  // its own Direct Variable Costs item list when the record is reopened
  // for editing — templateName alone isn't a safe lookup key since it's
  // a localized display string. Undefined for older saved records
  // created before this field existed, or for products built without a
  // template.
  templateId?: string;
}

// Bumped from v2 → v3: the saved-record shape changed (full categories +
// pricing basis instead of a flattened name/total snapshot) so that saved
// items can be reloaded for editing. Older v2 records use an incompatible
// shape and are intentionally not migrated.
const STORAGE_KEY = 'finsnap_pricing_v3';

const LABELS = {
  EN: {
    title: '💰 Pricing & Profit Estimator',
    subtitle: 'Add whatever cost categories fit your work — materials, labor, packaging, travel, tools, anything — then get a smart suggested selling price.',
    costSection: 'Step 1 · Cost Breakdown',
    productName: 'Name',
    productNamePlaceholder: 'e.g. Handmade candle, Logo design, Sink repair...',
    categoryNamePlaceholder: 'e.g. Materials, Labor, Packaging, Travel...',
    addCategory: '+ Add Cost Category',
    suggestHidden: '+ Suggest hidden costs',
    removeCategory: 'Remove category',
    removeItem: 'Remove item',
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
    update: 'Update This',
    newEntry: 'New',
    editingBadge: 'Editing a saved item',
    saved: 'Saved Items',
    noSaved: 'Nothing saved yet. Fill in the numbers above and save your first one.',
    delete: 'Delete',
    edit: 'Edit',
    tapToEdit: 'Tap an item to load it for editing',
    unnamedProduct: 'Untitled product',
    addAnotherProduct: 'Price another product',
    perUnit: 'per unit',
    modeSingle: 'One total',
    modeItems: 'Item by item',
    itemName: 'Item name',
    itemPrice: 'Price',
    selectItem: 'Select an item...',
    otherItem: 'Other (type your own)',
    addItem: 'Add item',
    subtotal: 'Subtotal',
    noItemsYet: 'No items added yet.',
    templatesButton: 'Start from a business template',
    templatesHint: 'Pick your type of business to prefill typical monthly cost categories — edit any amount after.',
    templateOther: "My business isn't listed",
    startingPointRequired: 'Pick a business template above, or "My business isn\u2019t listed", to start pricing a product.',
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
    pendingQtyInput: 'Fill in the fields above to calculate this',
    marginTooHighWithFees: "Your percent-based fees plus this profit margin add up to too much of the price to solve — lower the margin slider or reduce the percent fees.",
    breakEvenPrice: 'Break-even price (0% profit)',
    marketCheckTitle: 'Market check (optional)',
    marketCheckHint: "What do competitors charge for something similar? See how your price compares.",
    marketRefPricePlaceholder: 'e.g. what competitors charge',
    marketBelowBreakEvenWarning: "That market price is below your break-even point — you'd lose money on every sale at that price.",
    marginAtMarketPriceLabel: 'Your margin at that price',
    aboveSuggested: 'above your suggested price',
    belowSuggested: 'below your suggested price',
    groupDirect: 'Direct Variable Costs',
    groupSupplies: 'Packaging & Direct Consumables',
    groupHidden: 'Hidden & Overhead Costs',
    overheadPctLabel: 'Overhead (% of direct costs)',
    overheadPctHint: 'Covers electricity, equipment wear, unbillable time, rent share, etc. — calculated automatically so you don\'t have to guess a dollar amount for each one.',
    personalGuardTitle: 'A tool for businesses & freelancers',
    personalGuardBody: 'The Pricing & Profit Estimator helps you cost and price a product or service you sell, so it only applies to business and freelance accounts. Switch to a business account to use it.',
  },
  FR: {
    title: '💰 Calculateur de prix et de profit',
    subtitle: 'Ajoutez les catégories de coûts propres à votre activité — matières premières, main-d\u2019œuvre, emballage, déplacements, outillage, tout ce qui s\u2019applique — pour obtenir un prix de vente suggéré intelligent.',
    costSection: 'Étape 1 · Répartition des coûts',
    productName: 'Nom',
    productNamePlaceholder: 'p. ex. Bougie artisanale, Conception de logo, Réparation d\u2019évier...',
    categoryNamePlaceholder: 'p. ex. Matériaux, Main-d\u2019œuvre, Emballage, Déplacements...',
    addCategory: '+ Ajouter une catégorie de coût',
    suggestHidden: '+ Suggérer des coûts cachés',
    removeCategory: 'Supprimer la catégorie',
    removeItem: 'Supprimer l\u2019article',
    quantity: 'Quantité (unités, clients ou mandats)',
    totalCost: 'Coût total',
    costPerUnit: 'Coût par unité',
    priceSection: 'Étape 2 · Recommandation intelligente de prix',
    marginLabel: 'Marge bénéficiaire souhaitée',
    suggestedPrice: 'Prix de vente suggéré (par unité)',
    netProfit: 'Profit net (par unité)',
    profitMargin: 'Marge bénéficiaire',
    markup: 'Majoration sur le coût',
    batchSummary: 'Résumé du lot',
    totalRevenue: 'Revenu total',
    totalProfit: 'Profit total',
    save: 'Enregistrer',
    update: 'Mettre à jour',
    newEntry: 'Nouveau',
    editingBadge: 'Modification d\u2019un élément enregistré',
    saved: 'Éléments enregistrés',
    noSaved: 'Rien d\u2019enregistré pour l\u2019instant. Remplissez les champs ci-dessus et enregistrez votre premier élément.',
    delete: 'Supprimer',
    edit: 'Modifier',
    tapToEdit: 'Touchez un élément pour le charger et le modifier',
    unnamedProduct: 'Produit sans titre',
    addAnotherProduct: 'Établir le prix d\u2019un autre produit',
    perUnit: 'par unité',
    modeSingle: 'Total unique',
    modeItems: 'Article par article',
    itemName: 'Nom de l\u2019article',
    itemPrice: 'Prix',
    selectItem: 'Sélectionnez un article...',
    otherItem: 'Autre (saisissez le vôtre)',
    addItem: 'Ajouter un article',
    subtotal: 'Sous-total',
    noItemsYet: 'Aucun article ajouté pour l\u2019instant.',
    templatesButton: 'Partir d\u2019un modèle d\u2019entreprise',
    templatesHint: 'Choisissez votre type d\u2019entreprise pour préremplir les catégories de coûts mensuels habituelles — modifiez ensuite n\u2019importe quel montant.',
    templateOther: 'Mon entreprise n\u2019est pas répertoriée',
    startingPointRequired: 'Choisissez un modèle d\u2019entreprise ci-dessus, ou « Mon entreprise n\u2019est pas répertoriée », pour commencer à établir le prix d\u2019un produit.',
    pricingBasisLabel: 'Comment établissez-vous ce prix?',
    basisQuantity: 'Par unité',
    basisWeight: 'Par poids',
    basisHour: 'Par heure',
    basisProject: 'Par projet (mandat à prix fixe)',
    basisArea: 'Par superficie (pi² / m²)',
    batchWeightLabel: 'Poids total du lot (toute la recette/production)',
    unitWeightLabel: 'Poids d\u2019une unité vendue',
    weightYields: 'Ce lot donne',
    weightUnitsLabel: 'unités vendables',
    hoursLabel: 'Heures travaillées (ce mandat/cette période)',
    areaLabel: 'Superficie totale (pi² ou m²)',
    projectNote: 'Le coût total correspond au prix complet du projet. La quantité est fixée à 1.',
    pendingQtyInput: 'Remplissez les champs ci-dessus pour calculer ceci',
    marginTooHighWithFees: 'Vos frais en pourcentage et cette marge bénéficiaire représentent une trop grande part du prix pour être résolus — réduisez le curseur de marge ou les frais en pourcentage.',
    breakEvenPrice: 'Prix de seuil de rentabilité (0 % de profit)',
    marketCheckTitle: 'Comparaison du marché (facultatif)',
    marketCheckHint: 'Que facturent les concurrents pour un produit ou service similaire? Comparez votre prix.',
    marketRefPricePlaceholder: 'p. ex. ce que facturent les concurrents',
    marketBelowBreakEvenWarning: 'Ce prix du marché est inférieur à votre seuil de rentabilité — vous perdriez de l\u2019argent à chaque vente à ce prix.',
    marginAtMarketPriceLabel: 'Votre marge à ce prix',
    aboveSuggested: 'au-dessus de votre prix suggéré',
    belowSuggested: 'en dessous de votre prix suggéré',
    groupDirect: 'Coûts variables directs',
    groupSupplies: 'Emballage et consommables directs',
    groupHidden: 'Coûts cachés et frais généraux',
    overheadPctLabel: 'Frais généraux (% des coûts directs)',
    overheadPctHint: 'Couvre l\u2019électricité, l\u2019usure de l\u2019équipement, le temps non facturable, la part du loyer, etc. — calculé automatiquement pour que vous n\u2019ayez pas à deviner un montant pour chacun.',
    personalGuardTitle: 'Un outil pour les entreprises et travailleurs autonomes',
    personalGuardBody: 'Le calculateur de prix et de profit vous aide à établir le coût et le prix d\u2019un produit ou service que vous vendez; il s\u2019applique donc uniquement aux comptes affaires et travailleur autonome. Passez à un compte affaires pour l\u2019utiliser.',
  },
  FA: {
    title: '💰 محاسبه‌گر قیمت‌گذاری و سود',
    subtitle: 'هر دسته‌ی هزینه‌ای که با کارت جور در میاد اضافه کن — مواد، دستمزد، بسته‌بندی، رفت‌وآمد، ابزار، هرچی — بعد قیمت فروش پیشنهادی هوشمند بگیر.',
    costSection: 'مرحله ۱ · محاسبه هزینه‌ها',
    productName: 'نام',
    productNamePlaceholder: 'مثلاً شمع دست‌ساز، طراحی لوگو، تعمیر سینک...',
    categoryNamePlaceholder: 'مثلاً مواد اولیه، دستمزد، بسته‌بندی، رفت‌وآمد...',
    addCategory: '+ افزودن دسته‌ی هزینه',
    suggestHidden: '+ پیشنهاد هزینه‌های پنهان',
    removeCategory: 'حذف دسته',
    removeItem: 'حذف ردیف',
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
    update: 'به‌روزرسانی',
    newEntry: 'مورد جدید',
    editingBadge: 'در حال ویرایش یک مورد ذخیره‌شده',
    saved: 'موارد ذخیره‌شده',
    noSaved: 'هنوز چیزی ذخیره نشده. اعداد بالا را وارد کن و اولین مورد را ذخیره کن.',
    delete: 'حذف',
    edit: 'ویرایش',
    tapToEdit: 'برای ویرایش روی هر مورد بزن',
    unnamedProduct: 'محصول بدون‌نام',
    addAnotherProduct: 'قیمت‌گذاری یه محصول دیگه',
    perUnit: 'به ازای هر واحد',
    modeSingle: 'یک عدد کلی',
    modeItems: 'مورد به مورد',
    itemName: 'نام مورد',
    itemPrice: 'قیمت',
    selectItem: 'یک مورد را انتخاب کنید...',
    otherItem: 'سایر (وارد کردن دستی)',
    addItem: '+ افزودن مورد',
    subtotal: 'جمع جزء',
    noItemsYet: 'هنوز موردی اضافه نشده.',
    templatesButton: 'شروع از یک قالب کسب‌وکار',
    templatesHint: 'نوع کسب‌وکارت رو انتخاب کن تا دسته‌های هزینه‌ی معمول ماهانه از قبل پر بشن — بعداً هر مبلغی رو می‌تونی ویرایش کنی.',
    templateOther: 'کسب‌وکار من توی لیست نیست',
    startingPointRequired: 'اول از بین قالب‌های بالا یکی رو انتخاب کن، یا بزن «کسب‌وکار من توی لیست نیست» — بعد می‌تونی قیمت‌گذاری محصول رو شروع کنی.',
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
    pendingQtyInput: 'برای محاسبه‌ی این بخش، اول فیلدهای بالا را کامل کن',
    marginTooHighWithFees: 'مجموع کارمزدهای درصدی و حاشیه سودی که انتخاب کردی خیلی زیاده و قابل محاسبه نیست — لغزنده‌ی حاشیه سود رو کمتر کن یا درصد کارمزدها رو کاهش بده.',
    breakEvenPrice: 'نقطه‌ی سربه‌سر (سود صفر)',
    marketCheckTitle: 'مقایسه با بازار (اختیاری)',
    marketCheckHint: 'رقبا برای یه چیز مشابه چقدر می‌گیرن؟ قیمتت رو باهاش مقایسه کن.',
    marketRefPricePlaceholder: 'مثلاً قیمت رقبا',
    marketBelowBreakEvenWarning: 'این قیمت بازار از نقطه‌ی سربه‌سرت پایین‌تره — با این قیمت توی هر فروش ضرر می‌کنی.',
    marginAtMarketPriceLabel: 'حاشیه سودت با این قیمت',
    aboveSuggested: 'بالاتر از قیمت پیشنهادیت',
    belowSuggested: 'پایین‌تر از قیمت پیشنهادیت',
    groupDirect: 'هزینه‌های متغیر مستقیم',
    groupSupplies: 'بسته‌بندی و ملزومات مصرفی مستقیم',
    groupHidden: 'هزینه‌های پنهان و سربار',
    overheadPctLabel: 'سربار (٪ از هزینه‌های مستقیم)',
    overheadPctHint: 'شامل برق، استهلاک تجهیزات، زمان بدون‌فاکتور، سهم اجاره و مواردی مثل این می‌شه — خودکار حساب می‌شه، لازم نیست برای هرکدوم عدد حدس بزنی.',
    personalGuardTitle: 'ابزاری برای بیزینس‌ها و فریلنسرها',
    personalGuardBody: 'محاسبه‌گر قیمت‌گذاری و سود کمکت می‌کنه هزینه و قیمت یک محصول یا خدمتی که می‌فروشی رو حساب کنی، پس فقط برای حساب‌های بیزینسی و فریلنسری کاربرد داره. برای استفاده از این ابزار، حسابت رو به نوع بیزینسی سوییچ کن.',
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

function num(s: string | undefined) {
  const v = parseFloat(s ?? '');
  return isNaN(v) || v < 0 ? 0 : v;
}

// Empty starting values on purpose: price/qty fields should read as
// placeholders, not pre-filled zeros, until the person actually types
// something.
function newCategory(): CostCategory {
  return { id: generateId(), name: '', mode: 'single', single: '', items: [] };
}

function newItem(): CostItem {
  return { id: generateId(), name: '', price: '' };
}

// Category created by the manual "+ Suggest hidden costs" button, for
// when the person is pricing without a business template (or the
// template didn't add one). Uses the same overhead-as-%-of-direct-cost
// approach as template-applied categories, with a generic default rate
// since there's no business-type-specific figure to draw on here.
function hiddenCostsCategory(): CostCategory {
  return {
    id: generateId(),
    name: '',
    mode: 'items',
    single: '',
    items: [],
    overheadPct: '15',
    group: 'hidden',
  };
}

// Maps a recipeCategories position to its fixed group. Templates
// consistently ship exactly 3 categories in this order (direct
// consumables → supplies/equipment → hidden costs), but this stays
// correct even if a template ever has a different count: first is
// always the direct cost, last is always hidden/overhead, anything
// in between is supplies & equipment.
function recipeGroupForIndex(index: number, total: number): RecipeGroup {
  if (index === 0) return 'direct';
  if (index === total - 1) return 'hidden';
  return 'supplies';
}

// Dropdown options for "Direct Variable Costs" items, kept PER BUSINESS
// TEMPLATE (keyed by template id) instead of merged across all of them —
// so once the person has picked a business template, the item-name
// dropdown only offers that template's own ingredients/materials (e.g. a
// bakery sees flour/butter/sugar, not a barbershop's scissors/gloves).
// Built from each template's own direct-cost category (index 0 of
// `recipeCategories`), deduped and localized. Templates with no
// recipeCategories (service/time-based businesses) simply have no entry
// here — their Direct Variable Costs items, if any are added, fall back
// to a free-text field since there's nothing template-specific to offer.
const DIRECT_ITEM_OPTIONS_BY_TEMPLATE: Record<string, Record<'EN' | 'FA', string[]>> = (() => {
  const byTemplate: Record<string, Record<'EN' | 'FA', string[]>> = {};
  for (const t of BUSINESS_TEMPLATES) {
    const directCat = t.recipeCategories?.[0];
    if (!directCat) continue;
    const en = new Set<string>();
    const fa = new Set<string>();
    for (const item of directCat.items) {
      en.add(item.name.EN);
      fa.add(item.name.FA || item.name.EN);
    }
    byTemplate[t.id] = {
      EN: Array.from(en).sort((a, b) => a.localeCompare(b)),
      FA: Array.from(fa).sort((a, b) => a.localeCompare(b, 'fa')),
    };
  }
  return byTemplate;
})();

// Sentinel value for the dropdown's "Other" option — never a real item name.
const NAME_OTHER = '__other__';

// Flat-dollar portion of a category's total (single mode is always flat;
// item mode sums every item EXCEPT percent-of-price ones, since those
// can't be added as dollars without knowing the final selling price).
function categoryFlatTotal(c: CostCategory) {
  if (c.mode === 'single') return num(c.single);
  return c.items.reduce((s, it) => s + (it.kind === 'percent' ? 0 : num(it.price)), 0);
}

// Sum of percent-of-price rates in a category, as percentage points
// (e.g. 2.5 means 2.5%). Always 0 for single mode, since percent items
// only exist in item-by-item mode.
function categoryPercentTotal(c: CostCategory) {
  if (c.mode === 'single') return 0;
  return c.items.reduce((s, it) => s + (it.kind === 'percent' ? num(it.price) : 0), 0);
}

// The single source of truth for "how many sellable units" a batch/
// project/job amounts to, given the chosen pricing basis. Shared by the
// live calculator and by the saved-items list (so a reloaded/saved
// record shows numbers computed the exact same way).
function computeEffectiveQty(
  basis: PricingBasis,
  quantity: string,
  batchWeight: string,
  unitWeight: string,
  hoursOrArea: string
) {
  switch (basis) {
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
  activeTemplateId,
  namePlaceholder,
}: {
  labels: typeof LABELS.EN;
  isRtl: boolean;
  category: CostCategory;
  onChange: (next: CostCategory) => void;
  onRemove: () => void;
  canRemove: boolean;
  // Id of the business template currently backing the form (if any).
  // Direct Variable Costs items are only offered as a dropdown when a
  // template is selected AND that template has its own item list — the
  // dropdown always reflects that ONE template, never a mix of every
  // template's ingredients/materials.
  activeTemplateId: string | null;
  // Placeholder for the name field. Defaults to the generic free-form
  // hint, but a template-sourced group category (e.g. Hidden & Overhead)
  // passes its own group label instead, since the generic "e.g.
  // Materials, Labor..." hint doesn't fit a hidden-cost bucket.
  namePlaceholder?: string;
}) {
  const inputClass = 'w-full py-2.5 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
  const isDirectGroup = category.group === 'direct';
  const directOptions =
    (activeTemplateId && DIRECT_ITEM_OPTIONS_BY_TEMPLATE[activeTemplateId]?.[isRtl ? 'FA' : 'EN']) || [];
  // An item is in "custom name" mode if it already holds a name that isn't
  // one of the preset options (typed before this feature existed, or after
  // explicitly choosing "Other"), or if the person just clicked "Other" on
  // a still-blank item — tracked here since a blank custom item and a
  // blank not-yet-chosen item both have name === ''.
  const [forcedCustomIds, setForcedCustomIds] = useState<Set<string>>(new Set());

  const addItem = () => {
    onChange({ ...category, items: [...category.items, { ...newItem(), price: isDirectGroup ? '0' : '' }] });
  };
  const updateItem = (id: string, patch: Partial<CostItem>) => {
    onChange({ ...category, items: category.items.map(it => (it.id === id ? { ...it, ...patch } : it)) });
  };
  const removeItem = (id: string) => {
    onChange({ ...category, items: category.items.filter(it => it.id !== id) });
  };

  return (
    <div className="p-3">
      {category.group === 'hidden' ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-800">{namePlaceholder}</span>
            {canRemove && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRemove(); }}
                title={labels.removeCategory}
                aria-label={labels.removeCategory}
                className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3" onClick={e => e.stopPropagation()}>
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between mb-1">
              <span>{labels.overheadPctLabel}</span>
              <span className="text-amber-700 font-bold" dir="ltr">{num(category.overheadPct)}%</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={category.overheadPct ?? ''}
              onChange={e => onChange({ ...category, overheadPct: e.target.value })}
              placeholder="15"
              className={inputClass}
              dir="ltr"
            />
            <p className="text-[10px] text-slate-500 mt-1">{labels.overheadPctHint}</p>
          </div>
        </>
      ) : (
      <>
      <div className="flex items-center gap-2 mb-2">
        <input
          value={category.name}
          onChange={e => onChange({ ...category, name: e.target.value })}
          placeholder={namePlaceholder || labels.categoryNamePlaceholder}
          onClick={e => e.stopPropagation()}
          className={`${inputClass} flex-1 font-semibold`}
        />
        {canRemove && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove(); }}
            title={labels.removeCategory}
            aria-label={labels.removeCategory}
            className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex justify-end mb-2">
        <div className="flex bg-slate-100 rounded-lg p-0.5" onClick={e => e.stopPropagation()}>
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
            onClick={() => onChange({ ...category, mode: 'items', items: category.items.length ? category.items : [newItem()] })}
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
          onClick={e => e.stopPropagation()}
          placeholder="0.00"
          className={inputClass}
          dir="ltr"
        />
      ) : (
        <div className="space-y-2" onClick={e => e.stopPropagation()}>
          {category.items.length === 0 && <p className="text-[11px] text-slate-400">{labels.noItemsYet}</p>}
          {category.items.map(it => {
            // For "Direct Variable Costs" items, the name is picked from a
            // dropdown of known ingredients/materials (built from every
            // template) instead of typed freely. A name that isn't in the
            // preset list — a custom item, or one already typed before this
            // feature existed — falls back to the "Other" text input so
            // nothing already saved gets clobbered.
            const isCustomName = it.name !== '' && !directOptions.includes(it.name);
            const showAsDropdown =
              isDirectGroup && directOptions.length > 0 && !isCustomName && !forcedCustomIds.has(it.id);
            return (
              <div key={it.id} className="border border-slate-100 rounded-lg p-2">
                {showAsDropdown ? (
                  <select
                    value={it.name}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === NAME_OTHER) {
                        setForcedCustomIds(prev => new Set(prev).add(it.id));
                        updateItem(it.id, { name: '' });
                      } else {
                        updateItem(it.id, { name: val });
                      }
                    }}
                    className={`${inputClass} mb-2`}
                  >
                    <option value="" disabled={it.name !== ''}>{labels.selectItem}</option>
                    {directOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    <option value={NAME_OTHER}>{labels.otherItem}</option>
                  </select>
                ) : (
                  <input
                    value={it.name}
                    onChange={e => updateItem(it.id, { name: e.target.value })}
                    placeholder={labels.itemName}
                    className={`${inputClass} mb-2`}
                  />
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.price}
                    onChange={e => updateItem(it.id, { price: e.target.value })}
                    placeholder={labels.itemPrice}
                    className={`${inputClass} flex-1`}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    title={labels.removeCategory}
                    aria-label={labels.removeCategory}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
            <span className="font-bold text-slate-800" dir="ltr">
              {fmt(categoryFlatTotal(category))}
              {categoryPercentTotal(category) > 0 && ` + ${categoryPercentTotal(category)}%`}
            </span>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

export default function PricingTab({ lang, accountType }: PricingTabProps) {
  const isRtl = lang === 'FA';
  const L = LABELS[lang] ?? LABELS.EN;

  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CostCategory[]>(() => [newCategory(), newCategory()]);
  // Which category accordions are expanded. Starts as "all open" once the
  // initial categories exist (see effect below) so the first render
  // matches the old always-expanded look; collapses are then up to the
  // person.
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('');
  const [pricingBasis, setPricingBasis] = useState<PricingBasis>('quantity');
  // Weight mode needs two numbers (how much the whole batch makes vs. how
  // big one sellable unit is) to derive an effective quantity; hour/area
  // modes just need one continuous number; project mode has no input at
  // all — its quantity is always exactly 1 (total cost = total price).
  const [batchWeight, setBatchWeight] = useState('');
  const [unitWeight, setUnitWeight] = useState('');
  const [hoursOrArea, setHoursOrArea] = useState('');
  const [marginPct, setMarginPct] = useState('30');
  // Optional, not saved with the product — a quick "how does my calculated
  // price compare to what the market/competitors charge" check, the kind
  // of sanity check a pricing manager runs before finalizing a cost-plus
  // number. Kept ephemeral/local since it's advisory, not a fact about
  // the product itself.
  const [marketRefPrice, setMarketRefPrice] = useState('');
  const [saved, setSaved] = useState<SavedProduct[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  // Which saved record (if any) the form currently mirrors. Non-null
  // means "Save This" becomes "Update This" and saving overwrites that
  // record instead of creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Snapshot of `{ name, categories }` exactly as it looked right after
  // the most recently applied template — used to detect whether the
  // person has touched anything (including the name) since. `null` once
  // they edit something (or before any template has ever been applied).
  const [lastTemplateSnapshot, setLastTemplateSnapshot] = useState<string | null>(null);
  // Display name of the business template currently backing the form (if
  // any) — persists across "Add another product" so several products can
  // be saved under the same template, and is stored on each saved record
  // so the saved-items list can show which business type it belongs to.
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);
  // Id of that same template (e.g. "restaurant") — the actual lookup key
  // for the Direct Variable Costs dropdown's item list, since the display
  // name is localized and not a safe key across languages/edits.
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
  // See DraftSnapshot.skippedTemplate — true once the person explicitly
  // chooses "My business isn't listed" for the CURRENT product.
  const [skippedTemplate, setSkippedTemplate] = useState(false);
  // The required first step: either a template is applied, or the person
  // explicitly said their business isn't listed. Until one of those is
  // true, the product name field and cost categories stay hidden — there's
  // nothing sensible to name or cost yet.
  const hasChosenStartingPoint = appliedTemplateId !== null || skippedTemplate;

  // ---- Manage Products: multi-product draft state ----
  // Every field above (name, categories, pricingBasis, ...) is the ACTIVE
  // draft's live state — every existing handler in this file (updateCategory,
  // handleApplyTemplate, handleSave, ...) keeps reading/writing "the
  // current fields" completely unchanged. Switching drafts just snapshots
  useEffect(() => {
    setSaved(loadSaved());
    // Keep the accordion open by default for whatever categories exist
    // right after mount (covers the two starter categories created above).
    setOpenCategoryIds(prev => (prev.length === 0 ? categories.map(c => c.id) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  const expandCategory = (id: string) => {
    setOpenCategoryIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const updateCategory = (id: string, next: CostCategory) => {
    setCategories(prev => prev.map(c => (c.id === id ? next : c)));
    setLastTemplateSnapshot(null);
  };
  const addCategory = () => {
    const cat = newCategory();
    setCategories(prev => [...prev, cat]);
    expandCategory(cat.id);
    setLastTemplateSnapshot(null);
  };
  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setOpenCategoryIds(prev => prev.filter(x => x !== id));
    setLastTemplateSnapshot(null);
  };

  // Manual shortcut: add a generic overhead-% category for when the
  // person is pricing without a business template. Skips adding a
  // duplicate if a hidden-cost category is already present.
  const addHiddenCostsSuggestion = () => {
    if (categories.some(c => c.group === 'hidden')) return;
    const cat = hiddenCostsCategory();
    setCategories(prev => [...prev, cat]);
    expandCategory(cat.id);
    setLastTemplateSnapshot(null);
  };

  // Applying a template prefills typical monthly cost categories for the
  // chosen business type.
  //
  // Bug fix: name, categories, AND their sub-items must sync together as
  // ONE unit. Previously the "still on the last applied template" check
  // only covered `categories`, so picking a second template while nothing
  // had been touched would correctly refresh the categories but leave the
  // old template's name behind (since name was only ever filled when
  // blank). The snapshot now covers `{ name, categories }` together, so
  // switching templates replaces name + categories + items consistently,
  // while still respecting anything the person has actually edited.
  const handleApplyTemplate = (template: BusinessTemplate) => {
    const templateName = template.name[lang] || template.name.EN;

    setCategories(prev => {
      const currentSnapshot = JSON.stringify({ name, categories: prev });
      const untouchedSinceLastTemplate =
        lastTemplateSnapshot !== null && currentSnapshot === lastTemplateSnapshot;

      const base = untouchedSinceLastTemplate ? [] : prev;
      const kept = base.filter(c => {
        const hasContent = c.name.trim() !== '' || c.single.trim() !== '' || c.items.length > 0;
        if (!hasContent) return false;
        // Recipe-group categories (`group` set) came from a *previous*
        // template's per-batch breakdown (or from the hidden-cost
        // shortcut). Many templates reuse the exact same label for a
        // given slot (e.g. every template's hidden-cost category is
        // named "Hidden Costs (often forgotten)"), so if we kept these
        // around, the name-based dedup below would treat the NEW
        // template's category as a duplicate and silently drop it —
        // leaving the OLD template's numbers sitting under a heading
        // that now belongs to a different business type. Recipe/group
        // categories always get replaced wholesale by the newly applied
        // template; only the person's own free-form categories survive.
        if (c.group) return false;
        return true;
      });
      const existingNames = new Set(kept.map(c => c.name.trim().toLowerCase()));
      const additions: CostCategory[] = [];

      if (template.recipeCategories) {
        // Per-batch cost breakdown — the CATEGORY SHELLS (direct /
        // supplies / hidden) are created here. Direct and supplies start
        // with an empty item list on purpose: the template supplies
        // context (which buckets exist, and — via activeTemplateId —
        // which ingredient/material names populate each bucket's
        // dropdown), not pre-filled cost rows, so the person adds their
        // own items one at a time and the costs section stays quiet
        // immediately after picking a template instead of being flooded
        // with a template's full ingredient list.
        //
        // The Hidden & Overhead group is the one exception: it's
        // consistently the thing people forget to price in at all, so it
        // ships pre-filled with the template's own per-business-type
        // default line items and figures (already curated per template in
        // businessTemplates.ts) — no extra copy, just numbers already
        // sitting in the field, ready to accept or overwrite.
        const totalRecipeCats = template.recipeCategories.length;
        template.recipeCategories.forEach((cat, idx) => {
          const label = cat.name[lang] || cat.name.EN;
          if (existingNames.has(label.trim().toLowerCase())) return;
          existingNames.add(label.trim().toLowerCase());
          const group = recipeGroupForIndex(idx, totalRecipeCats);
          additions.push({
            ...newCategory(),
            // Direct/Supplies keep the template's own descriptive name
            // (e.g. "Ingredients", "Packaging") since it's distinct from
            // the fixed group header above it. The Hidden group's own
            // template name is near-identical to the fixed "Hidden &
            // Overhead Costs" header already shown right above it, so
            // showing it again in the editable name field would just be
            // the same phrase twice — left blank instead, still fully
            // renameable if the person wants a label of their own.
            name: group === 'hidden' ? '' : label,
            mode: 'items',
            // Hidden & Overhead is purely the automatic overhead-%
            // field now — no itemized entry at all, even for genuinely
            // percent-of-price fees (card processing, CPP). Those are
            // folded into each template's overheadPctOfDirectCost
            // instead, so the person never sees a manual item table
            // here — same as Direct/Supplies would look before this,
            // just without any items to add.
            items: [],
            overheadPct: group === 'hidden' ? String(template.overheadPctOfDirectCost ?? 15) : undefined,
            group,
          });
        });
      } else {
        // Same principle for non-recipe (single-value) templates: create
        // the suggested category names, but leave each amount blank
        // instead of pre-filling the template's typical figure — the
        // person types their own number.
        template.items.forEach(item => {
          const label = item.label[lang] || item.label.EN;
          if (existingNames.has(label.trim().toLowerCase())) return;
          existingNames.add(label.trim().toLowerCase());
          additions.push({ ...newCategory(), name: label, single: '' });
        });
        // This template has no per-batch recipe breakdown, so it also
        // never ships its own hidden-costs bucket. Add one with a generic
        // overhead % (same default as the manual "Suggest hidden costs"
        // shortcut) so overhead isn't forgotten — still fully editable.
        // Name left blank for the same reason as above: it would
        // otherwise repeat the fixed "Hidden & Overhead Costs" header
        // verbatim.
        if (!existingNames.has(L.groupHidden.trim().toLowerCase())) {
          additions.push({
            ...newCategory(),
            name: '',
            mode: 'items',
            items: [],
            overheadPct: String(template.overheadPctOfDirectCost ?? 15),
            group: 'hidden',
          });
        }
      }

      const next = [...kept, ...additions];
      // Applying a template never touches the product name — it's meant
      // to hold the SPECIFIC product/service (e.g. "Chocolate cake 2kg"),
      // not the business type. The business type is shown separately as a
      // badge below the field (see appliedTemplateName).
      setOpenCategoryIds(next.map(c => c.id));
      setLastTemplateSnapshot(JSON.stringify({ name, categories: next }));
      return next;
    });
    setAppliedTemplateName(templateName);
    setAppliedTemplateId(template.id);
    setSkippedTemplate(false);
    if (template.defaultPricingBasis) setPricingBasis(template.defaultPricingBasis);
    setShowTemplates(false);
  };

  const effectiveQty = useMemo(
    () => computeEffectiveQty(pricingBasis, quantity, batchWeight, unitWeight, hoursOrArea),
    [pricingBasis, quantity, batchWeight, unitWeight, hoursOrArea]
  );

  const calc = useMemo(() => {
    // effectiveQty is 0 only when the pricing basis needs an input that
    // isn't filled in yet (batch/unit weight for 'weight', hours for
    // 'hour', area for 'area'). Silently treating that as "1 unit" would
    // show a confidently wrong cost-per-unit and selling price (e.g. the
    // whole batch's ingredient cost presented as if it were one dessert's
    // cost). 'quantity' and 'project' always resolve to >=1 on their own,
    // so they're never in this state.
    const qtyResolved = effectiveQty > 0;
    const qty = qtyResolved ? effectiveQty : 1;
    const margin = Math.min(95, Math.max(0, num(marginPct)));
    const marginFraction = margin / 100;

    // Direct + Supplies (and any free-form categories) — everything
    // EXCEPT the Hidden & Overhead group — form the direct-cost base that
    // overhead is calculated against.
    const cogsFlatTotal = categories.reduce((s, c) => s + (c.group === 'hidden' ? 0 : categoryFlatTotal(c)), 0);
    // Overhead (electricity share, equipment depreciation, unbillable
    // time, rent share, etc.) as a % of direct costs, instead of asking
    // the person to itemize and guess a dollar figure for each one —
    // standard small-business overhead-absorption practice. There's at
    // most one 'hidden' group category (only ever assigned by template
    // application / the manual "Suggest hidden costs" shortcut).
    const hiddenCategory = categories.find(c => c.group === 'hidden');
    const overheadFraction = hiddenCategory ? Math.max(0, num(hiddenCategory.overheadPct)) / 100 : 0;
    const overheadCost = overheadFraction * cogsFlatTotal;
    // The hidden category can still hold manually-added flat items too
    // (via "+ Add item"), for anyone who wants to itemize on top of the
    // overhead % instead of relying on it alone.
    const hiddenExtraFlat = hiddenCategory ? categoryFlatTotal(hiddenCategory) : 0;
    const flatTotal = cogsFlatTotal + overheadCost + hiddenExtraFlat;
    const flatCostPerUnit = flatTotal / qty;
    // Percent-of-price items (card processing fees, CPP, etc.) are rates
    // that apply to the FINAL selling price, not the batch — they're not
    // divided by qty.
    const percentPts = categories.reduce((s, c) => s + categoryPercentTotal(c), 0);
    const percentFraction = percentPts / 100;

    // Solve algebraically instead of assuming price = cost * (1 + markup):
    // price = flatCost + percentFraction*price + marginFraction*price
    //      => price * (1 - percentFraction - marginFraction) = flatCost
    //      => price = flatCost / (1 - percentFraction - marginFraction)
    // If the percent fees plus the desired margin leave less than 5% of
    // the price to cover flat costs, the combination is mathematically
    // infeasible (or absurdly leveraged) — flag it instead of showing a
    // wildly inflated or negative number.
    const denom = 1 - percentFraction - marginFraction;
    const pricingInfeasible = denom <= 0.05;

    const suggestedPrice = pricingInfeasible ? 0 : flatCostPerUnit / denom;
    const costPerUnit = pricingInfeasible ? flatCostPerUnit : flatCostPerUnit + percentFraction * suggestedPrice;
    const totalCost = costPerUnit * qty;
    const netProfitPerUnit = pricingInfeasible ? 0 : suggestedPrice - costPerUnit;
    const actualMarginPct = !pricingInfeasible && suggestedPrice > 0 ? (netProfitPerUnit / suggestedPrice) * 100 : 0;
    const markupPct = !pricingInfeasible && costPerUnit > 0 ? (netProfitPerUnit / costPerUnit) * 100 : 0;

    // Break-even price: the same formula at 0% margin — the absolute
    // floor below which every sale loses money, regardless of what
    // margin the person eventually chooses. A pricing/financial
    // consultant checks this first, independent of the margin slider.
    const breakEvenDenom = 1 - percentFraction;
    const breakEvenInfeasible = breakEvenDenom <= 0.05;
    const breakEvenPrice = breakEvenInfeasible ? 0 : flatCostPerUnit / breakEvenDenom;

    // Optional market/competitor reference price check: back-solve what
    // margin the person would actually get if they charged the market
    // price instead of the cost-plus suggestion, and flag it if that
    // price doesn't even clear break-even.
    const marketPrice = num(marketRefPrice);
    const hasMarketPrice = marketPrice > 0;
    const marketCostAtPrice = flatCostPerUnit + percentFraction * marketPrice;
    const marginAtMarketPrice = hasMarketPrice ? ((marketPrice - marketCostAtPrice) / marketPrice) * 100 : 0;
    const marketBelowBreakEven = hasMarketPrice && !breakEvenInfeasible && marketPrice < breakEvenPrice;
    const marketVsSuggestedPct = hasMarketPrice && suggestedPrice > 0 ? ((marketPrice - suggestedPrice) / suggestedPrice) * 100 : 0;

    return {
      totalCost,
      costPerUnit,
      qty,
      qtyResolved,
      percentPts,
      pricingInfeasible,
      suggestedPrice,
      netProfitPerUnit,
      actualMarginPct,
      markupPct,
      breakEvenPrice,
      breakEvenInfeasible,
      hasMarketPrice,
      marketPrice,
      marginAtMarketPrice,
      marketBelowBreakEven,
      marketVsSuggestedPct,
      totalRevenue: suggestedPrice * qty,
      totalProfit: netProfitPerUnit * qty,
    };
  }, [categories, effectiveQty, marginPct, marketRefPrice]);

  const resetForm = () => {
    setName('');
    setCategories([newCategory(), newCategory()]);
    setQuantity('');
    setPricingBasis('quantity');
    setBatchWeight('');
    setUnitWeight('');
    setHoursOrArea('');
    setMarginPct('30');
    setEditingId(null);
    setLastTemplateSnapshot(null);
    setAppliedTemplateName(null);
    setAppliedTemplateId(null);
    setSkippedTemplate(false);
  };

  const handleSave = () => {
    const now = Date.now();
    if (editingId) {
      setSaved(prev => {
        const next = prev.map(p =>
          p.id === editingId
            ? {
                ...p,
                name: name.trim() || (isRtl ? 'مورد بدون نام' : 'Untitled item'),
                categories,
                pricingBasis,
                quantity,
                batchWeight,
                unitWeight,
                hoursOrArea,
                marginPct,
                // The live appliedTemplateName/appliedTemplateId already
                // reflect this record's template correctly (handleSelectSaved
                // set them from it), or null if the person explicitly
                // detached it via "My business isn't listed" since loading
                // it for edit. Falling back to the OLD record's value here
                // would silently undo that explicit detachment on Update.
                templateName: appliedTemplateName ?? undefined,
                templateId: appliedTemplateId ?? undefined,
                updatedAt: now,
              }
            : p
        );
        persistSaved(next);
        return next;
      });
      return;
    }

    const entry: SavedProduct = {
      id: generateId(),
      name: name.trim() || (isRtl ? 'مورد بدون نام' : 'Untitled item'),
      categories,
      pricingBasis,
      quantity,
      batchWeight,
      unitWeight,
      hoursOrArea,
      marginPct,
      createdAt: now,
      templateName: appliedTemplateName ?? undefined,
      templateId: appliedTemplateId ?? undefined,
    };
    setSaved(prev => {
      const next = [entry, ...prev];
      persistSaved(next);
      return next;
    });
    resetForm();
  };

  // Loads a saved record back into the form so it can be edited, instead
  // of only ever being deletable.
  const handleSelectSaved = (p: SavedProduct) => {
    setName(p.name);
    setCategories(p.categories);
    setOpenCategoryIds(p.categories.map(c => c.id));
    setPricingBasis(p.pricingBasis);
    setQuantity(p.quantity);
    setBatchWeight(p.batchWeight);
    setUnitWeight(p.unitWeight);
    setHoursOrArea(p.hoursOrArea);
    setMarginPct(p.marginPct);
    setEditingId(p.id);
    setLastTemplateSnapshot(null);
    setAppliedTemplateName(p.templateName ?? null);
    setAppliedTemplateId(p.templateId ?? null);
    setSkippedTemplate(!p.templateId);
  };

  const handleDelete = (id: string) => {
    setSaved(prev => {
      const next = prev.filter(p => p.id !== id);
      persistSaved(next);
      return next;
    });
    if (editingId === id) resetForm();
  };

  const inputClass = 'w-full py-2.5 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';

  // The Pricing & Profit Estimator only makes sense for someone pricing a
  // product or service they sell — a personal/home account has no such
  // thing to price, so show guidance instead of the calculator.
  if (accountType === 'personal') {
    return (
      <div className="px-4 lg:px-6 pt-4 pb-28 lg:pb-12 max-w-2xl lg:max-w-4xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
        <h2 className="text-xl font-bold text-slate-900 mb-1">{L.title}</h2>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mt-4 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1.5">{L.personalGuardTitle}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{L.personalGuardBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 pt-4 pb-28 lg:pb-12 max-w-2xl lg:max-w-4xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      <h2 className="text-xl font-bold text-slate-900 mb-1">{L.title}</h2>
      <p className="text-xs text-slate-500 mb-4">{L.subtitle}</p>

      {(editingId || hasChosenStartingPoint) && (
        <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 mb-4 ${editingId ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'}`}>
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${editingId ? 'text-amber-700' : 'text-slate-500'}`}>
            {editingId && <PenSquare className="w-3.5 h-3.5" />}
            {editingId ? L.editingBadge : (name.trim() || L.unnamedProduct)}
          </span>
          <button
            type="button"
            onClick={resetForm}
            className={`flex items-center gap-1 text-xs font-semibold ${editingId ? 'text-amber-700 hover:text-amber-900' : 'text-emerald-600 hover:text-emerald-700'}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {editingId ? L.newEntry : L.addAnotherProduct}
          </button>
        </div>
      )}

      {/* Step 1: Cost breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-emerald-600" />
          {L.costSection}
        </h3>

        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowTemplates(s => !s)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-all"
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                {L.templatesButton}
              </span>
              {hasChosenStartingPoint && (
                <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
              )}
            </button>

            {(showTemplates || !hasChosenStartingPoint) && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
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
                    onClick={() => {
                      // Detach any previously-applied template — this is a
                      // real switch to "no template", not just a first
                      // choice. Existing category names/items/amounts are
                      // left exactly as they are (nothing destructive);
                      // only the template LINK is cleared, so the Direct
                      // Variable Costs dropdown correctly stops offering
                      // that template's ingredient list going forward.
                      setSkippedTemplate(true);
                      setAppliedTemplateId(null);
                      setAppliedTemplateName(null);
                      setLastTemplateSnapshot(null);
                      setShowTemplates(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                  >
                    <span className="text-lg shrink-0">✏️</span>
                    <span className="text-xs font-medium text-slate-700 leading-tight">{L.templateOther}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {!hasChosenStartingPoint && (
            <p className="text-xs text-slate-400 text-center py-2">{L.startingPointRequired}</p>
          )}

          {hasChosenStartingPoint && !categories.some(c => c.group === 'hidden') && (
            <button
              type="button"
              onClick={addHiddenCostsSuggestion}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold rounded-xl transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {L.suggestHidden}
            </button>
          )}

          {hasChosenStartingPoint && (
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{L.productName}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={L.productNamePlaceholder} className={inputClass} />
            {appliedTemplateName && (
              <p className="text-[11px] text-emerald-600 font-medium mt-1">{appliedTemplateName}</p>
            )}
          </div>
          )}

          {hasChosenStartingPoint && (
          <>
          <Accordion
            type="multiple"
            value={openCategoryIds}
            onValueChange={setOpenCategoryIds}
            className="space-y-2"
          >
            {categories.map((c, idx) => {
              const groupLabels: Record<RecipeGroup, string> = {
                direct: L.groupDirect,
                supplies: L.groupSupplies,
                hidden: L.groupHidden,
              };
              // Show the fixed header only once per group, right above the
              // first category that belongs to it — so a template's 3-part
              // breakdown reads as 3 clearly-labeled sections instead of
              // repeating the same header on every card.
              const showGroupHeader = !!c.group && categories[idx - 1]?.group !== c.group;
              const groupPlaceholder = c.group ? groupLabels[c.group as RecipeGroup] : L.categoryNamePlaceholder;
              const displayName = c.name.trim() || groupPlaceholder;

              return (
                <div key={c.id}>
                  {showGroupHeader && (
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5 mt-3 first:mt-0">
                      {groupLabels[c.group as RecipeGroup]}
                    </div>
                  )}
                  <AccordionItem value={c.id} className="border border-slate-100 rounded-xl overflow-hidden">
                    <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                      <span className="flex items-center justify-between w-full gap-2 pr-2">
                        <span className="text-xs font-semibold text-slate-700 truncate">{displayName}</span>
                        <span className="text-[11px] font-bold text-slate-400 shrink-0" dir="ltr">
                          {c.group === 'hidden'
                            ? `${num(c.overheadPct)}%${categoryPercentTotal(c) > 0 ? ` +${categoryPercentTotal(c)}%` : ''}${categoryFlatTotal(c) > 0 ? ` +${fmt(categoryFlatTotal(c))}` : ''}`
                            : `${fmt(categoryFlatTotal(c))}${categoryPercentTotal(c) > 0 ? ` +${categoryPercentTotal(c)}%` : ''}`}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 pb-0 px-0">
                      <CostCategoryEditor
                        labels={L}
                        isRtl={isRtl}
                        category={c}
                        onChange={next => updateCategory(c.id, next)}
                        onRemove={() => removeCategory(c.id)}
                        canRemove={categories.length > 1}
                        activeTemplateId={appliedTemplateId}
                        namePlaceholder={groupPlaceholder}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </div>
              );
            })}
          </Accordion>

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
          </>
          )}
        </div>

        {hasChosenStartingPoint && (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">{L.totalCost}</p>
            <p className="text-sm font-bold text-slate-800" dir="ltr">{fmt(calc.totalCost)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">{L.costPerUnit}</p>
            <p className="text-sm font-bold text-slate-800" dir="ltr">
              {calc.qtyResolved ? fmt(calc.costPerUnit) : '—'}
            </p>
          </div>
        </div>
        )}
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

        {!calc.qtyResolved && hasChosenStartingPoint ? (
          <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-4 mb-3 text-center">
            <p className="text-xs font-medium text-slate-500">{L.pendingQtyInput}</p>
          </div>
        ) : calc.pricingInfeasible ? (
          <div className="rounded-2xl bg-amber-50 border border-dashed border-amber-200 p-4 mb-3 text-center flex items-start gap-2 text-start">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-amber-700">{L.marginTooHighWithFees}</p>
          </div>
        ) : (
        <>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 mb-3 text-white">
          <p className="text-[10px] font-semibold uppercase opacity-80 mb-0.5">{L.suggestedPrice}</p>
          <p className="text-2xl font-bold" dir="ltr">{fmt(calc.suggestedPrice)}</p>
          {!calc.breakEvenInfeasible && (
            <p className="text-[10px] opacity-80 mt-1" dir="ltr">
              {L.breakEvenPrice}: {fmt(calc.breakEvenPrice)}
            </p>
          )}
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

        {/* Market check — the piece a Pricing Manager / Market Research
            Analyst adds on top of pure cost-plus math: how does the
            cost-plus number sit against what the market actually pays?
            Optional and not saved with the product; purely a live sanity
            check while deciding on a final price. */}
        <div className="border-t border-slate-100 pt-3 mb-3">
          <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-slate-500" />
            {L.marketCheckTitle}
          </p>
          <p className="text-[10px] text-slate-400 mb-2">{L.marketCheckHint}</p>
          <input
            type="number"
            min="0"
            step="0.01"
            value={marketRefPrice}
            onChange={e => setMarketRefPrice(e.target.value)}
            placeholder={L.marketRefPricePlaceholder}
            className={`${inputClass} mb-2`}
            dir="ltr"
          />
          {calc.hasMarketPrice && (
            calc.marketBelowBreakEven ? (
              <div className="rounded-xl bg-rose-50 p-3 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-rose-700">{L.marketBelowBreakEvenWarning}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                <span>{L.marginAtMarketPriceLabel}: <span className="font-bold text-slate-800" dir="ltr">{calc.marginAtMarketPrice.toFixed(1)}%</span></span>
                <span>
                  {calc.marketVsSuggestedPct >= 0 ? L.aboveSuggested : L.belowSuggested}:{' '}
                  <span className="font-bold text-slate-800" dir="ltr">{Math.abs(calc.marketVsSuggestedPct).toFixed(1)}%</span>
                </span>
              </div>
            )
          )}
        </div>
        </>
        )}

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

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            {editingId ? L.update : L.save}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              type="button"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              {L.newEntry}
            </button>
          )}
        </div>

      </div>

      {/* Saved items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" />
            {L.saved} {saved.length > 0 && `(${saved.length})`}
          </h3>
          {saved.length > 0 && (
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {L.tapToEdit}
            </p>
          )}
        </div>
        {saved.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{L.noSaved}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {saved.map(p => {
              const rawQty = computeEffectiveQty(p.pricingBasis, p.quantity, p.batchWeight, p.unitWeight, p.hoursOrArea);
              const qtyResolved = rawQty > 0;
              const qty = qtyResolved ? rawQty : 1;
              const cogsFlatTotal = p.categories.reduce((s, c) => s + (c.group === 'hidden' ? 0 : categoryFlatTotal(c)), 0);
              const savedHiddenCategory = p.categories.find(c => c.group === 'hidden');
              const overheadFraction = savedHiddenCategory ? Math.max(0, num(savedHiddenCategory.overheadPct)) / 100 : 0;
              const hiddenExtraFlat = savedHiddenCategory ? categoryFlatTotal(savedHiddenCategory) : 0;
              const flatTotal = cogsFlatTotal + overheadFraction * cogsFlatTotal + hiddenExtraFlat;
              const flatCostPerUnit = flatTotal / qty;
              const percentPts = p.categories.reduce((s, c) => s + categoryPercentTotal(c), 0);
              const percentFraction = percentPts / 100;
              const margin = Math.min(95, Math.max(0, num(p.marginPct)));
              const denom = 1 - percentFraction - margin / 100;
              const pricingInfeasible = denom <= 0.05;
              const price = pricingInfeasible ? 0 : flatCostPerUnit / denom;
              const costPerUnit = pricingInfeasible ? flatCostPerUnit : flatCostPerUnit + percentFraction * price;
              const totalCost = costPerUnit * qty;
              const profit = pricingInfeasible ? 0 : price - costPerUnit;
              const isEditing = p.id === editingId;
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectSaved(p)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelectSaved(p); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${isEditing ? 'bg-amber-50' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                      {p.name}
                      {isEditing && <PenSquare className="w-3 h-3 text-amber-600 shrink-0" />}
                    </p>
                    {p.templateName && (
                      <p className="text-[10px] text-emerald-600 font-medium truncate">{p.templateName}</p>
                    )}
                    <p className="text-[10px] text-slate-400" dir="ltr">
                      {qtyResolved && !pricingInfeasible
                        ? <>{L.costPerUnit}: {fmt(costPerUnit)} · {L.suggestedPrice.split('(')[0].trim()}: {fmt(price)} · {L.netProfit.split('(')[0].trim()}: {fmt(profit)}</>
                        : <>{L.costPerUnit}: — · {L.totalCost}: {fmt(totalCost)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      title={L.edit}
                      aria-label={L.edit}
                      onClick={e => { e.stopPropagation(); handleSelectSaved(p); }}
                      className="text-slate-300 hover:text-emerald-600 transition-colors p-1.5"
                    >
                      <PenSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title={L.delete}
                      aria-label={L.delete}
                      onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
