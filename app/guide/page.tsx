'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Zap, Home, PlusCircle, List, Calculator, FileText, Wallet,
  Settings as SettingsIcon, CreditCard, Info, ChevronRight, ShieldAlert,
} from 'lucide-react';

type GLang = 'EN' | 'FA';

interface Section {
  id: string;
  icon: React.ElementType;
  title: string;
  intro?: string;
  blocks: Array<
    | { type: 'p'; text: string }
    | { type: 'h3'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'note'; text: string }
    | { type: 'table'; headers: string[]; rows: string[][] }
  >;
}

const CONTENT: Record<GLang, Section[]> = {
  EN: [
    {
      id: 'intro',
      icon: Zap,
      title: 'What is FinSnap?',
      blocks: [
        { type: 'p', text: 'FinSnap is an expense-tracking and pricing app built for the Canadian market, with a focus on immigrants and small business owners. It tracks income and expenses in CAD, scans receipts automatically, and includes a dedicated Pricing & Profit Calculator to help you set a fair, accurate price for anything you sell.' },
        { type: 'ul', items: [
          'Personal / Home — track household income, expenses, and savings.',
          'Business / Freelancer — manage receipts, invoices, and GST/HST/QST-relevant records.',
        ] },
        { type: 'note', text: 'You choose this once when you first sign in, and can change it later in Settings → Account Type.' },
      ],
    },
    {
      id: 'dashboard',
      icon: Home,
      title: 'Dashboard',
      blocks: [
        { type: 'p', text: 'Your home screen shows:' },
        { type: 'ul', items: [
          'Total Income, Total Expenses, and Net Profit for the selected time period (Today / Week / Month / 3 Months / All).',
          'A Monthly Overview chart of the last 6 months (always 6 months, regardless of the filter above).',
          'A spending breakdown by category.',
          'Your subscription tier and how many receipt scans you have left this month.',
          'Quick actions: Add Transaction, Generate Tax Report, and Upgrade (if applicable).',
        ] },
      ],
    },
    {
      id: 'transactions-add',
      icon: PlusCircle,
      title: 'Adding a Transaction',
      blocks: [
        { type: 'p', text: 'Tap "+ Add Transaction" (or the floating Quick Scan button). Two ways to record it:' },
        { type: 'h3', text: 'A) Scan a receipt' },
        { type: 'ul', items: [
          'Upload a photo or PDF of the receipt (JPG, PNG, or PDF).',
          'AI reads it and fills in the merchant, amount, tax, date, and a suggested category automatically.',
          'Review the extracted fields before confirming — always double-check.',
          'If a very similar receipt was already scanned recently, FinSnap warns you it might be a duplicate.',
        ] },
        { type: 'note', text: 'Scanning is a paid-plan feature. On the Free tier, a daily YouTube code unlocks manual entry for the day — scanning itself needs Basic, Pro, or Business.' },
        { type: 'h3', text: 'B) Enter manually' },
        { type: 'ul', items: ['Choose Income or Expense, type the amount (CAD), description, category, and date, then save.'] },
      ],
    },
    {
      id: 'transactions-tab',
      icon: List,
      title: 'Transactions Tab',
      blocks: [
        { type: 'p', text: 'Your full transaction history. You can:' },
        { type: 'ul', items: [
          'Search by merchant or description.',
          'Filter by category.',
          'Edit or delete any transaction.',
          'Export everything to Excel/CSV — requires a paid plan or an active gift code.',
        ] },
      ],
    },
    {
      id: 'pricing',
      icon: Calculator,
      title: 'Pricing & Profit Calculator',
      intro: 'FinSnap\'s dedicated tool for figuring out what to actually charge — not just tracking money already spent. Built around real cost-accounting practice, simplified so you don\'t need an accounting background.',
      blocks: [
        { type: 'h3', text: 'Step 1 — Start from a business template (optional)' },
        { type: 'p', text: '21 ready-made templates for common immigrant-run businesses (restaurant, home-based food, cleaning, rideshare/delivery, salons, trucking, construction, tutoring, photography, bridal makeup, handyman, and more). Picking one pre-fills the right cost categories, a dropdown of typical materials, and a realistic default overhead %. If your business isn\'t listed, choose "My business isn\'t listed" to build from scratch — same 3-part structure below.' },
        { type: 'h3', text: 'Step 2 — Fill in your costs (3 categories)' },
        { type: 'ul', items: [
          'Direct Variable Costs — raw materials that go directly into one unit (flour, protein, fabric).',
          'Packaging & Direct Consumables — disposable per-unit items (containers, bags, one-time-use supplies).',
          'Hidden & Overhead Costs — indirect costs that are easy to forget: electricity, equipment wear, unbillable admin time, rent share, insurance.',
        ] },
        { type: 'note', text: 'Hidden & Overhead is NOT itemized. Instead of guessing dollar figures one by one, you get a single automatic percentage (based on business type — e.g. ~19% food, ~10% real estate, ~12% retail) applied on top of your direct costs. Adjust that one number if your real overhead differs — never itemize it.' },
        { type: 'h3', text: 'Step 3 — Choose your pricing basis' },
        { type: 'ul', items: [
          'By quantity — a fixed number of units/clients/jobs.',
          'By weight — enter total batch weight and one unit\'s weight; FinSnap works out how many units the batch yields.',
          'By hour — for hourly services.',
          'By area — priced per square foot.',
          'By project — one fixed total price for the whole job.',
        ] },
        { type: 'h3', text: 'Step 4 — Set your margin and see the price' },
        { type: 'p', text: 'Drag the margin slider (desired profit margin, as % of the selling price — not a markup on cost). FinSnap then shows:' },
        { type: 'ul', items: [
          'Suggested Price — what to charge, per unit.',
          'Break-even price — the absolute floor: sell below this and you lose money.',
          'Net Profit, Profit Margin %, and Markup % for that price.',
          'An optional Market Check — enter what competitors charge and see your real margin at that price, with a warning if it\'s below break-even.',
        ] },
        { type: 'h3', text: 'Saving products' },
        { type: 'p', text: 'Hit Save when you\'re happy with a price. It\'s added to your Saved Items list, where you can reopen, edit, or delete it anytime. The form clears automatically so you\'re ready for the next product.' },
      ],
    },
    {
      id: 'reports',
      icon: FileText,
      title: 'Reports Tab',
      blocks: [
        { type: 'p', text: 'A monthly view of your income, expenses, and profit, with tools to slice and export the numbers:' },
        { type: 'ul', items: [
          'Filter by month, or set a custom date range spanning any period.',
          'Filter by category, and switch between Income / Expenses / All.',
          'Top Income and Top Expense category breakdowns, with a share-of-total bar for each.',
          'Search by Product / Order — find every income and expense tied to a specific product or order, based on the transaction description, with its own spent/received/net totals.',
          'Export the current view, or just your search results, to CSV — requires a paid plan or an active gift code.',
        ] },
      ],
    },
    {
      id: 'tax-report',
      icon: ShieldAlert,
      title: 'Tax Report',
      blocks: [
        { type: 'p', text: 'A separate, accountant-ready view of your year — open it from the "Generate Tax Report" quick action on the Dashboard. Three views:' },
        { type: 'ul', items: [
          'Summary — totals for the fiscal year.',
          'Ledger — every transaction, one row each.',
          'Tax Summary — total GST/HST/QST collected from your scanned receipts, by category.',
        ] },
        { type: 'note', text: 'FinSnap totals the tax amounts detected on your receipts. It does NOT calculate what you owe or can claim on a GST/HST/QST return. For an actual remittance figure, consult an accountant or the CRA directly.' },
        { type: 'p', text: 'Downloading as CSV or PDF requires a paid plan or an active gift code.' },
      ],
    },
    {
      id: 'budget',
      icon: Wallet,
      title: 'Budget',
      blocks: [
        { type: 'p', text: 'Set up a monthly budget with recurring bills (rent, subscriptions, loan payments). For each one:' },
        { type: 'ul', items: [
          'An amount and due day of the month.',
          'How it repeats — one-time, weekly, monthly, or yearly.',
          'A reminder before it\'s due — a banner appears on the Dashboard within 3 days of a due date.',
        ] },
      ],
    },
    {
      id: 'settings',
      icon: SettingsIcon,
      title: 'Settings',
      blocks: [
        { type: 'ul', items: [
          'Language — English, French, or Persian.',
          'Account Type — switch between Personal and Business anytime.',
          'Personal info — date of birth.',
          'Preferences — base currency.',
          'Manage your plan — see the Plans section below.',
          'Privacy Policy and Terms of Service.',
          'Delete my account — permanently deletes your account and all data. Cannot be undone.',
        ] },
      ],
    },
    {
      id: 'plans',
      icon: CreditCard,
      title: 'Subscription Plans',
      blocks: [
        { type: 'p', text: 'Receipt scanning, manual transaction entry, and the tax report\'s PDF/CSV export are all paid features. The Free tier can unlock all of them temporarily with a gift code posted on FinSnap\'s YouTube channel — nothing about your existing data changes when a code expires.' },
        { type: 'table', headers: ['Plan', 'Monthly', 'Yearly', 'Scans / month'], rows: [
          ['Basic', '$6.99', '$69 (2 months free)', '50'],
          ['Pro', '$19.99', '$199 (2 months free)', '250'],
          ['Business', '$39.99', '$399 (2 months free)', '600'],
        ] },
        { type: 'p', text: 'All plans are billed securely through Stripe. Change plans, update payment, or cancel anytime from Settings → Manage your plan. Canceling keeps your paid features until the end of your current billing period, then switches you to Free — you won\'t be charged again.' },
      ],
    },
    {
      id: 'notes',
      icon: Info,
      title: 'Good to Know',
      blocks: [
        { type: 'ul', items: [
          'All amounts are in Canadian dollars (CAD).',
          'Scanned receipts are kept for 6 years, matching the CRA\'s record-keeping requirement for small businesses.',
          'FinSnap is a tracking and estimating tool, not a substitute for a professional accountant — always double-check tax-related figures before filing.',
          'The Pricing Calculator\'s numbers (overhead %, business templates) are realistic starting points, not guarantees — adjust them to match your real costs.',
        ] },
      ],
    },
  ],
  FA: [
    {
      id: 'intro',
      icon: Zap,
      title: 'فاین‌اسنپ چیه؟',
      blocks: [
        { type: 'p', text: 'فاین‌اسنپ یه اپلیکیشن مدیریت هزینه و قیمت‌گذاریه که مخصوص بازار کاناداست، با تمرکز روی مهاجرین و صاحبان کسب‌وکار کوچیک. درآمد و هزینه‌ها رو به دلار کانادا ثبت می‌کنه، رسیدها رو خودکار اسکن می‌کنه، و یه ابزار اختصاصی «محاسبه‌گر قیمت‌گذاری و سود» داره که کمکت می‌کنه برای هر چیزی که می‌فروشی قیمت درست و منصفانه‌ای تعیین کنی.' },
        { type: 'ul', items: [
          'شخصی / خانگی — پیگیری درآمد، هزینه و پس‌انداز خونواده.',
          'کسب‌وکار / فریلنسر — مدیریت رسید، فاکتور، و مدارک مرتبط با GST/HST/QST.',
        ] },
        { type: 'note', text: 'این انتخاب رو یه‌بار موقع اولین ورود انجام می‌دی، و بعداً هم می‌تونی از تنظیمات ← نوع حساب عوضش کنی.' },
      ],
    },
    {
      id: 'dashboard',
      icon: Home,
      title: 'داشبورد',
      blocks: [
        { type: 'p', text: 'صفحه‌ی اصلی این‌ها رو نشون می‌ده:' },
        { type: 'ul', items: [
          'مجموع درآمد، مجموع هزینه، و سود خالص برای بازه‌ی انتخابی (امروز / هفته / ماه / ۳ ماه / همه).',
          'نمودار «نمای کلی ماهانه» برای ۶ ماه اخیر (همیشه ۶ ماه آخر، مستقل از فیلتر بالا).',
          'تفکیک هزینه‌ها بر اساس دسته‌بندی.',
          'سطح اشتراکت و تعداد اسکن باقی‌مونده‌ی این ماه.',
          'دسترسی سریع: افزودن تراکنش، تولید گزارش مالیاتی، و ارتقا (اگه لازم باشه).',
        ] },
      ],
    },
    {
      id: 'transactions-add',
      icon: PlusCircle,
      title: 'افزودن تراکنش',
      blocks: [
        { type: 'p', text: 'روی «+ افزودن تراکنش» (یا دکمه‌ی شناور اسکن سریع) بزن. دو راه داری:' },
        { type: 'h3', text: 'الف) اسکن رسید' },
        { type: 'ul', items: [
          'عکس یا PDF رسید رو آپلود کن (JPG، PNG یا PDF).',
          'هوش مصنوعی می‌خوندش و اسم فروشگاه، مبلغ، مالیات، تاریخ و یه دسته‌بندی پیشنهادی رو خودکار پر می‌کنه.',
          'قبل از تایید، فیلدهای استخراج‌شده رو چک کن — همیشه دوباره بررسی کن.',
          'اگه یه رسید خیلی شبیه یکی که اخیراً اسکن کردی باشه، فاین‌اسنپ هشدار می‌ده که شاید تکراری باشه.',
        ] },
        { type: 'note', text: 'اسکن فقط برای پلن‌های پولیه. توی پلن رایگان، کد روزانه‌ی یوتیوب ورود دستی رو برای همون روز باز می‌کنه — خودِ اسکن نیاز به پلن Basic، Pro یا Business داره.' },
        { type: 'h3', text: 'ب) ورود دستی' },
        { type: 'ul', items: ['درآمد یا هزینه رو انتخاب کن، مبلغ (دلار کانادا)، توضیحات، دسته‌بندی و تاریخ رو بنویس، و ذخیره کن.'] },
      ],
    },
    {
      id: 'transactions-tab',
      icon: List,
      title: 'تب تراکنش‌ها',
      blocks: [
        { type: 'p', text: 'تاریخچه‌ی کامل تراکنش‌هاته. می‌تونی:' },
        { type: 'ul', items: [
          'بر اساس اسم فروشگاه یا توضیحات جست‌وجو کنی.',
          'بر اساس دسته‌بندی فیلتر کنی.',
          'هر تراکنشی رو ویرایش یا حذف کنی.',
          'همه رو به Excel/CSV خروجی بگیری — نیاز به پلن پولی یا کد فعال هدیه داره.',
        ] },
      ],
    },
    {
      id: 'pricing',
      icon: Calculator,
      title: 'محاسبه‌گر قیمت‌گذاری و سود',
      intro: 'ابزار اختصاصی فاین‌اسنپ برای این‌که بفهمی واقعاً باید چقدر بگیری — نه صرفاً ثبت پولی که قبلاً خرج شده. بر پایه‌ی اصول واقعیِ حسابداری هزینه، ولی ساده‌سازی‌شده تا نیازی به پیش‌زمینه‌ی حسابداری نداشته باشی.',
      blocks: [
        { type: 'h3', text: 'مرحله ۱ — شروع از یک قالب کسب‌وکار (اختیاری)' },
        { type: 'p', text: '۲۱ قالب آماده برای کسب‌وکارهای رایج بین مهاجرین (رستوران، غذای خانگی، نظافتی، رایدشر/دلیوری، آرایشگاه، حمل‌ونقل، ساخت‌وساز، تدریس خصوصی، عکاسی، آرایش عروس، تعمیرکاری و مواردی مثل این). با انتخاب هرکدوم، دسته‌بندی‌های مناسب، یه لیست کشویی از مواد اولیه‌ی رایج، و یه درصد سربار پیش‌فرض واقع‌بینانه خودکار پر می‌شن. اگه کسب‌وکارت توی لیست نبود، «کسب‌وکارم توی لیست نیست» رو بزن — بازم همون ساختار سه‌بخشی زیر رو داری.' },
        { type: 'h3', text: 'مرحله ۲ — هزینه‌هات رو وارد کن (۳ دسته)' },
        { type: 'ul', items: [
          'هزینه‌های متغیر مستقیم — مواد خامی که مستقیم توی یه واحد می‌ره (آرد، پروتئین، پارچه).',
          'بسته‌بندی و ملزومات مصرفی مستقیم — اقلام یک‌بارمصرفِ هر واحد (ظرف، کیسه، لوازم یک‌بارمصرف).',
          'هزینه‌های پنهان و سربار — هزینه‌ی غیرمستقیمی که راحت یادت می‌ره: برق، استهلاک تجهیزات، زمان اداریِ بدون‌فاکتور، سهم اجاره، بیمه.',
        ] },
        { type: 'note', text: '«هزینه‌های پنهان و سربار» آیتم به آیتم نیست. به‌جای حدس‌زدن عدد برای برق یا استهلاک تجهیزات یکی‌یکی، یه درصد خودکار (بر اساس نوع کسب‌وکار — مثلاً حدود ۱۹٪ غذایی، ۱۰٪ املاک، ۱۲٪ خرده‌فروشی) روی هزینه‌های مستقیمت اعمال می‌شه. اگه سربار واقعیت فرق داره، همون یه عدد رو تغییر بده — هیچ‌وقت آیتم به آیتم واردش نکن.' },
        { type: 'h3', text: 'مرحله ۳ — مبنای قیمت‌گذاریت رو انتخاب کن' },
        { type: 'ul', items: [
          'بر اساس تعداد — یه عدد ثابت از واحد/مشتری/کار.',
          'بر اساس وزن — وزن کل بچ و وزن یه واحد فروشی رو وارد می‌کنی؛ فاین‌اسنپ خودش حساب می‌کنه چند واحد می‌ده.',
          'بر اساس ساعت — برای خدمات ساعتی.',
          'بر اساس متراژ — برای خدمات با قیمت فوت‌مربعی.',
          'بر اساس پروژه — یه قیمت کل ثابت برای کل کار.',
        ] },
        { type: 'h3', text: 'مرحله ۴ — حاشیه سود رو تنظیم کن و قیمت رو ببین' },
        { type: 'p', text: 'لغزنده‌ی حاشیه سود رو بکش (به‌عنوان درصدی از قیمت فروش — نه اضافه‌کردن روی هزینه). بعدش فاین‌اسنپ این‌ها رو نشون می‌ده:' },
        { type: 'ul', items: [
          'قیمت پیشنهادی — چقدر به‌ازای هر واحد بگیری.',
          'نقطه‌ی سربه‌سر — کف مطلق: پایین‌تر از این بفروشی ضرر می‌کنی.',
          'سود خالص، ٪ حاشیه سود، و ٪ نشانه‌گذاری (Markup) برای همون قیمت.',
          'یه «مقایسه با بازار» اختیاری — قیمت رقبا رو وارد کن و ببین با اون قیمت واقعاً چند درصد سود می‌کنی، با هشدار اگه زیر نقطه‌ی سربه‌سرت باشه.',
        ] },
        { type: 'h3', text: 'ذخیره‌ی محصولات' },
        { type: 'p', text: 'وقتی از قیمت راضی بودی، «ذخیره» رو بزن. به لیست «موارد ذخیره‌شده» اضافه می‌شه، جایی که هر وقت خواستی می‌تونی بازش کنی، ویرایش یا حذفش کنی. فرم خودکار پاک می‌شه تا برای محصول بعدی آماده باشی.' },
      ],
    },
    {
      id: 'reports',
      icon: FileText,
      title: 'تب گزارش‌ها',
      blocks: [
        { type: 'p', text: 'یه نمای ماهانه از درآمد، هزینه و سودت، همراه با ابزارهایی برای فیلتر و خروجی گرفتن:' },
        { type: 'ul', items: [
          'فیلتر بر اساس ماه، یا یه بازه‌ی تاریخ دلخواه برای هر دوره‌ای.',
          'فیلتر بر اساس دسته‌بندی، و جابه‌جایی بین درآمد / هزینه / همه.',
          'دسته‌بندی‌های برتر درآمد و هزینه، با نوار سهم از کل برای هرکدوم.',
          'جستجو بر اساس محصول / سفارش — همه‌ی درآمدها و هزینه‌های مربوط به یک محصول یا سفارش خاص رو بر اساس توضیحات تراکنش پیدا کن، با مجموع هزینه/دریافتی/سود خالص جداگانه.',
          'خروجی گرفتن از نمای فعلی، یا فقط نتایج جستجو، به CSV — نیاز به پلن پولی یا کد فعال هدیه داره.',
        ] },
      ],
    },
    {
      id: 'tax-report',
      icon: ShieldAlert,
      title: 'گزارش مالیاتی',
      blocks: [
        { type: 'p', text: 'یه نمای جداگانه و آماده‌برای‌حسابدار از سالت — از دکمه‌ی «تولید گزارش مالیاتی» توی داشبورد بازش کن. سه بخش:' },
        { type: 'ul', items: [
          'خلاصه — مجموع‌های سال مالی.',
          'دفتر کل — هر تراکنش، یه ردیف.',
          'خلاصه‌ی مالیات — مجموع GST/HST/QST جمع‌آوری‌شده از رسیدهای اسکن‌شده‌ت، بر اساس دسته‌بندی.',
        ] },
        { type: 'note', text: 'فاین‌اسنپ مبلغ‌های مالیاتیِ شناسایی‌شده روی رسیدهات رو جمع می‌زنه. این محاسبه‌ی چیزی که بدهکاری یا می‌تونی توی اظهارنامه‌ی GST/HST/QST مطالبه کنی نیست. برای عدد واقعیِ پرداختی، با یه حسابدار یا مستقیماً CRA مشورت کن.' },
        { type: 'p', text: 'دانلود گزارش به‌صورت CSV یا PDF نیاز به پلن پولی یا کد فعال هدیه داره.' },
      ],
    },
    {
      id: 'budget',
      icon: Wallet,
      title: 'بودجه',
      blocks: [
        { type: 'p', text: 'یه بودجه‌ی ماهانه با قبض‌های تکرارشونده بساز (اجاره، اشتراک‌ها، اقساط وام). برای هرکدوم:' },
        { type: 'ul', items: [
          'یه مبلغ و روز سررسید توی ماه.',
          'چطور تکرار بشه — یک‌بار، هفتگی، ماهانه یا سالانه.',
          'یادآوری قبل از سررسید — وقتی سررسید تا ۳ روز دیگه‌ست، یه بنر روی داشبورد ظاهر می‌شه.',
        ] },
      ],
    },
    {
      id: 'settings',
      icon: SettingsIcon,
      title: 'تنظیمات',
      blocks: [
        { type: 'ul', items: [
          'زبان — انگلیسی، فرانسه یا فارسی.',
          'نوع حساب — هر وقت خواستی بین شخصی و کسب‌وکار سوییچ کن.',
          'اطلاعات شخصی — تاریخ تولد.',
          'ترجیحات — ارز پایه.',
          'مدیریت پلن — بخش «پلن‌های اشتراک» رو ببین.',
          'حریم خصوصی و شرایط استفاده.',
          'حذف حسابم — حساب و تمام داده‌هات رو برای همیشه پاک می‌کنه. غیرقابل بازگشته.',
        ] },
      ],
    },
    {
      id: 'plans',
      icon: CreditCard,
      title: 'پلن‌های اشتراک',
      blocks: [
        { type: 'p', text: 'اسکن رسید، ورود دستی تراکنش، و خروجی PDF/CSV گزارش مالیاتی همه امکانات پولی هستن. توی پلن رایگان هم می‌تونی با کد هدیه‌ی کانال یوتیوب فاین‌اسنپ، به‌طور موقت به همه‌شون دسترسی پیدا کنی — با تموم شدن اعتبار کد، هیچ‌چیزی از اطلاعات قبلیت پاک نمی‌شه.' },
        { type: 'table', headers: ['پلن', 'ماهانه', 'سالانه', 'اسکن در ماه'], rows: [
          ['Basic', '$۶.۹۹', '$۶۹ (۲ ماه رایگان)', '۵۰'],
          ['Pro', '$۱۹.۹۹', '$۱۹۹ (۲ ماه رایگان)', '۲۵۰'],
          ['Business', '$۳۹.۹۹', '$۳۹۹ (۲ ماه رایگان)', '۶۰۰'],
        ] },
        { type: 'p', text: 'همه‌ی پلن‌ها با امنیت کامل از طریق Stripe صورت‌حساب می‌شن. هر وقت خواستی از تنظیمات ← مدیریت پلن، پلن رو عوض کن، روش پرداخت رو آپدیت کن، یا لغو کن. با لغو کردن، امکانات پولیت تا پایان همون دوره‌ی صورت‌حساب فعلی فعال می‌مونه، بعدش به پلن رایگان تبدیل می‌شی — دیگه هزینه‌ای ازت کسر نمی‌شه.' },
      ],
    },
    {
      id: 'notes',
      icon: Info,
      title: 'نکات مهم',
      blocks: [
        { type: 'ul', items: [
          'همه‌ی مبلغ‌ها به دلار کانادا (CAD) هستن.',
          'رسیدهای اسکن‌شده ۶ سال نگه‌داری می‌شن، مطابق با الزام نگه‌داری مدارک CRA برای کسب‌وکارهای کوچیک.',
          'فاین‌اسنپ یه ابزار پیگیری و تخمینه، نه جایگزین یه حسابدار حرفه‌ای — قبل از اظهارنامه، همیشه ارقام مالیاتی رو دوباره چک کن.',
          'اعداد محاسبه‌گر قیمت‌گذاری (٪ سربار، قالب‌های کسب‌وکار) نقطه‌ی شروعِ واقع‌بینانه‌ان، نه تضمین — با هزینه‌ی واقعیت تطبیقشون بده.',
        ] },
      ],
    },
  ],
};

const UI = {
  EN: { title: 'FinSnap', subtitle: 'User Guide', jump: 'Jump to a section', back: 'Back to FinSnap' },
  FA: { title: 'فاین‌اسنپ', subtitle: 'راهنمای کاربر', jump: 'برو به یه بخش', back: 'برگشت به فاین‌اسنپ' },
};

function GuideContent() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<GLang>('FA');

  useEffect(() => {
    const q = searchParams.get('lang');
    if (q === 'EN' || q === 'FA') setLang(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRtl = lang === 'FA';
  const sections = CONTENT[lang];
  const ui = UI[lang];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 py-2" dir={isRtl ? 'rtl' : 'ltr'}>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white"
          >
            <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
            {ui.back}
          </a>
        </div>
      </div>
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2" dir="ltr">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold text-slate-900 tracking-tight">{ui.title}</span>
            <span className="text-xs text-slate-400">· {ui.subtitle}</span>
          </div>
          <div className="flex items-center bg-slate-100 rounded-full p-1 gap-0.5">
            {(['EN', 'FA'] as GLang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-150 ${
                  lang === l ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-16 max-w-2xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Quick jump chips */}
        <div className="mb-4">
          <p className={`text-[11px] font-semibold text-slate-400 uppercase mb-2 ${isRtl ? 'text-right' : 'text-left'}`}>{ui.jump}</p>
          <div className="flex flex-wrap gap-1.5">
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              >
                <s.icon className="w-3 h-3" />
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {sections.map(s => (
          <section key={s.id} id={s.id} className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm scroll-mt-20">
            <h2 className={`text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5 ${isRtl ? 'text-right' : 'text-left'}`}>
              <s.icon className="w-4 h-4 text-emerald-600 shrink-0" />
              {s.title}
            </h2>
            {s.intro && (
              <p className={`text-xs text-slate-500 mb-3 ${isRtl ? 'text-right' : 'text-left'}`}>{s.intro}</p>
            )}
            {s.blocks.map((b, i) => {
              if (b.type === 'p') {
                return <p key={i} className={`text-[13px] text-slate-700 leading-relaxed mb-2.5 ${isRtl ? 'text-right' : 'text-left'}`}>{b.text}</p>;
              }
              if (b.type === 'h3') {
                return <h3 key={i} className={`text-xs font-bold text-emerald-700 mt-3 mb-1.5 ${isRtl ? 'text-right' : 'text-left'}`}>{b.text}</h3>;
              }
              if (b.type === 'ul') {
                return (
                  <ul key={i} className={`mb-2.5 space-y-1 ${isRtl ? 'pr-4' : 'pl-4'}`}>
                    {b.items.map((it, j) => (
                      <li key={j} className={`text-[13px] text-slate-700 leading-relaxed list-disc ${isRtl ? 'text-right' : 'text-left'}`}>{it}</li>
                    ))}
                  </ul>
                );
              }
              if (b.type === 'note') {
                return (
                  <div key={i} className={`flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-2.5 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-800 leading-relaxed">{b.text}</p>
                  </div>
                );
              }
              if (b.type === 'table') {
                return (
                  <div key={i} className="overflow-x-auto mb-2.5 rounded-xl border border-slate-100">
                    <table className="w-full text-[12px]" dir={isRtl ? 'rtl' : 'ltr'}>
                      <thead>
                        <tr className="bg-emerald-600 text-white">
                          {b.headers.map((h, k) => (
                            <th key={k} className={`px-3 py-2 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {b.rows.map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {row.map((cell, ci) => (
                              <td key={ci} className={`px-3 py-2 text-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return null;
            })}
          </section>
        ))}

        <p className={`text-[11px] text-slate-400 flex items-center gap-1 ${isRtl ? 'justify-end flex-row-reverse' : ''}`}>
          <ChevronRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
          {lang === 'FA' ? 'برای برگشت به برنامه، از دکمه‌ی بالای صفحه استفاده کن.' : 'Use the back link at the top of the page to return to the app.'}
        </p>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={null}>
      <GuideContent />
    </Suspense>
  );
}
