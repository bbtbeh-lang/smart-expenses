// 21 ready-made budget templates for common immigrant-run small businesses
// in Canada. Each template is a set of expense categories with a
// suggested monthly amount in CAD — a realistic starting point, not a
// guarantee. Applying a template in BudgetModal adds these as *custom*
// budget items (it never touches the built-in category list), and never
// overwrites an amount the user already entered for a matching label.
//
// Amounts are ballpark monthly figures for a small/solo operation in a
// mid-size Canadian city. They are meant to be edited, not followed
// exactly — BudgetModal shows them as a normal editable starting value.

export interface BusinessTemplateItem {
  label: { EN: string; FR: string; FA: string };
  amount: number; // suggested monthly CAD
}

// A per-product/per-batch ingredient or cost line — e.g. "Flour: $2" for
// one batch of pastries. Distinct from BusinessTemplateItem (which is a
// *monthly overhead* figure like "$600/month on ingredients" for
// BudgetModal). recipeCategories are what the Profit Calculator
// (PricingTab) uses instead, since costing a single product needs
// per-batch amounts, not a monthly aggregate.
export interface RecipeCostItem {
  name: { EN: string; FR: string; FA: string };
  price: number; // CAD, for one batch/unit
}
export interface RecipeCategory {
  name: { EN: string; FR: string; FA: string };
  items: RecipeCostItem[];
}

export interface BusinessTemplate {
  id: string;
  icon: string;
  name: { EN: string; FR: string; FA: string };
  items: BusinessTemplateItem[];
  // Suggested pricing basis for PricingTab's Smart Price Recommender —
  // e.g. a bakery prices by weight, a tutor by the hour, a photographer
  // per project. Purely a starting-point suggestion; always changeable.
  defaultPricingBasis?: 'quantity' | 'weight' | 'hour' | 'project' | 'area';
  // Optional per-product/per-batch cost breakdown for the Profit
  // Calculator. When present, PricingTab uses THIS instead of `items`
  // (which is monthly overhead, not a single product's cost). Only
  // defined for hands-on-product businesses where itemized ingredient/
  // material costs make sense (a home baker, tailor, jeweller...); for
  // service/time-based businesses `items` alone is fine since there's no
  // single "unit" to break materials down for.
  // Suggested overhead — indirect costs like electricity, equipment
  // depreciation, rent share, unbillable admin time, etc. — expressed as
  // a percentage of direct costs (COGS) rather than itemized dollar
  // guesses. This is standard small-business practice: nobody actually
  // meters "how much electricity did this one dish use"; they estimate
  // overhead as a rule-of-thumb % of direct costs instead. PricingTab
  // pre-fills the Hidden & Overhead category with this percentage so the
  // person isn't asked to itemize things they have no practical way to
  // measure.
  overheadPctOfDirectCost?: number;
  recipeCategories?: RecipeCategory[];
}

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'restaurant',
    overheadPctOfDirectCost: 19, // suggested overhead as % of direct costs
    defaultPricingBasis: 'quantity',
    icon: '🍽️',
    name: { EN: 'Restaurant / Food Service', FR: 'Restaurant / Service alimentaire', FA: 'رستوران / خدمات غذایی' },
    items: [
      { label: { EN: 'Food & Ingredients', FR: 'Nourriture et ingrédients', FA: 'مواد غذایی و اولیه' }, amount: 3500 },
      { label: { EN: 'Rent / Lease', FR: 'Loyer / Bail', FA: 'اجاره محل' }, amount: 3500 },
      { label: { EN: 'Staff Wages', FR: 'Salaires du personnel', FA: 'حقوق کارکنان' }, amount: 5000 },
      { label: { EN: 'Utilities', FR: 'Services publics', FA: 'قبوض (آب و برق و گاز)' }, amount: 600 },
      { label: { EN: 'Delivery App Fees', FR: "Frais d'applications de livraison", FA: 'کارمزد اپلیکیشن‌های تحویل' }, amount: 400 },
      { label: { EN: 'Licensing & Food Safety', FR: 'Permis et salubrité alimentaire', FA: 'مجوز و بهداشت مواد غذایی' }, amount: 100 },
    ],
    // Example: one plate/dish (adjust to your actual menu item and portions).
    recipeCategories: [
      {
        name: { EN: 'Ingredients (per dish)', FR: 'Ingrédients (par plat)', FA: 'مواد اولیه (هر پرس)' },
        items: [
          { name: { EN: 'Protein (meat/chicken/fish)', FR: 'Protéine (viande/poulet/poisson)', FA: 'پروتئین (گوشت/مرغ/ماهی)' }, price: 4.5 },
          { name: { EN: 'Rice / Bread / Starch', FR: 'Riz / Pain / Féculent', FA: 'برنج/نان/نشاسته' }, price: 1.2 },
          { name: { EN: 'Vegetables & Garnish', FR: 'Légumes et garniture', FA: 'سبزیجات و تزیین' }, price: 1.0 },
          { name: { EN: 'Sauces & Spices', FR: 'Sauces et épices', FA: 'سس و ادویه' }, price: 0.7 },
        ],
      },
      {
        name: { EN: 'Packaging / Disposables', FR: 'Emballage / Jetables', FA: 'بسته‌بندی و ظروف یک‌بارمصرف' },
        items: [
          { name: { EN: 'Takeout Container', FR: 'Contenant pour emporter', FA: 'ظرف بیرون‌بر' }, price: 0.6 },
          { name: { EN: 'Cutlery & Napkins', FR: 'Ustensiles et serviettes', FA: 'قاشق‌چنگال و دستمال' }, price: 0.3 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'mobile_car_wash',
    overheadPctOfDirectCost: 15, // suggested overhead as % of direct costs
    defaultPricingBasis: 'quantity',
    icon: '🚗',
    name: { EN: 'Mobile Car Wash / Detailing', FR: 'Lavage auto mobile / Detailing', FA: 'کارواش سیار / دیتیلینگ خودرو' },
    items: [
      { label: { EN: 'Cleaning Supplies & Chemicals', FR: 'Produits de nettoyage et chimiques', FA: 'مواد و محلول‌های شست‌وشو' }, amount: 400 },
      { label: { EN: 'Water & Power (mobile unit)', FR: "Eau et électricité (unité mobile)", FA: 'آب و برق (واحد سیار)' }, amount: 150 },
      { label: { EN: 'Vehicle Fuel', FR: 'Carburant du véhicule', FA: 'سوخت خودرو' }, amount: 350 },
      { label: { EN: 'Equipment Maintenance', FR: 'Entretien de l\'équipement', FA: 'نگهداری تجهیزات' }, amount: 200 },
      { label: { EN: 'Commercial Auto Insurance', FR: 'Assurance auto commerciale', FA: 'بیمه خودروی تجاری' }, amount: 250 },
      { label: { EN: 'Marketing / Flyers', FR: 'Marketing / Dépliants', FA: 'تبلیغات و بروشور' }, amount: 100 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Cleaning Supplies (per wash)', FR: 'Produits de nettoyage (par lavage)', FA: 'مواد شست‌وشو (هر شستشو)' },
        items: [
          { name: { EN: 'Soap / Shampoo', FR: 'Savon / Shampoing', FA: 'مایع شست‌وشو' }, price: 2.0 },
          { name: { EN: 'Wax / Polish', FR: 'Cire / Lustrant', FA: 'واکس/پولیش' }, price: 2.5 },
          { name: { EN: 'Interior Cleaner / Air Freshener', FR: 'Nettoyant intérieur / Désodorisant', FA: 'اسپری داخل خودرو و خوشبوکننده' }, price: 1.0 },
        ],
      },
      {
        name: { EN: 'Consumables', FR: 'Consommables', FA: 'ملزومات مصرفی' },
        items: [
          { name: { EN: 'Microfiber Towels (wear)', FR: 'Serviettes microfibres (usure)', FA: 'حوله میکروفایبر (استهلاک)' }, price: 1.5 },
          { name: { EN: 'Gloves & Applicator Pads', FR: 'Gants et tampons applicateurs', FA: 'دستکش و اسفنج' }, price: 0.5 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'freelancer',
    overheadPctOfDirectCost: 130, // suggested overhead as % of direct costs — folds in allocated internet/home-office cost, since a freelancer's real overhead routinely exceeds their tiny direct-tooling cost
    defaultPricingBasis: 'hour',
    icon: '💻',
    name: { EN: 'Freelancer / Consultant', FR: 'Pigiste / Consultant', FA: 'فریلنسر / مشاور' },
    items: [
      { label: { EN: 'Software & Subscriptions', FR: 'Logiciels et abonnements', FA: 'نرم‌افزار و اشتراک‌ها' }, amount: 100 },
      { label: { EN: 'Internet & Phone', FR: 'Internet et téléphone', FA: 'اینترنت و تلفن' }, amount: 90 },
      { label: { EN: 'Home Office Supplies', FR: 'Fournitures de bureau à domicile', FA: 'لوازم دفتر خانگی' }, amount: 60 },
      { label: { EN: 'Marketing / Website', FR: 'Marketing / Site web', FA: 'تبلیغات و وب‌سایت' }, amount: 80 },
      { label: { EN: 'Professional Development', FR: 'Développement professionnel', FA: 'آموزش و توسعه حرفه‌ای' }, amount: 100 },
      { label: { EN: 'Accounting / Bookkeeping', FR: 'Comptabilité', FA: 'حسابداری' }, amount: 150 },
    ],
    // "Per unit" here = one billable hour. Freelancers often price only on
    // what they'll charge, without accounting for overhead per hour —
    // this breaks that out explicitly.
    recipeCategories: [
      {
        name: { EN: 'Tools Allocated Per Hour', FR: "Outils alloués par heure", FA: 'سهم ابزار به ازای هر ساعت' },
        items: [
          { name: { EN: 'Software Subscriptions (per billable hour)', FR: 'Abonnements logiciels (par heure facturable)', FA: 'اشتراک نرم‌افزار (هر ساعت قابل‌فاکتور)' }, price: 1.5 },
          { name: { EN: 'Cloud / Storage (per hour)', FR: 'Infonuagique / stockage (par heure)', FA: 'فضای ابری (هر ساعت)' }, price: 0.5 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'real_estate',
    overheadPctOfDirectCost: 10, // suggested overhead as % of direct costs
    defaultPricingBasis: 'project',
    icon: '🏠',
    name: { EN: 'Real Estate Agent', FR: 'Agent immobilier', FA: 'مشاور املاک' },
    items: [
      { label: { EN: 'MLS / Board Fees', FR: 'Frais MLS / Chambre immobilière', FA: 'هزینه عضویت MLS/انجمن' }, amount: 150 },
      { label: { EN: 'Marketing & Signage', FR: 'Marketing et affichage', FA: 'تبلیغات و تابلو' }, amount: 500 },
      { label: { EN: 'Vehicle & Gas', FR: 'Véhicule et essence', FA: 'خودرو و بنزین' }, amount: 400 },
      { label: { EN: 'Professional Photography', FR: 'Photographie professionnelle', FA: 'عکاسی حرفه‌ای' }, amount: 200 },
      { label: { EN: 'Brokerage Fees', FR: 'Frais de courtage', FA: 'کارمزد بروکراژ' }, amount: 300 },
      { label: { EN: 'Client Gifts / Closing Costs', FR: 'Cadeaux clients / Frais de clôture', FA: 'هدایای مشتری و هزینه‌های تسویه' }, amount: 150 },
    ],
    // "Per unit" here = one closed listing/deal.
    recipeCategories: [
      {
        name: { EN: 'Marketing Per Listing', FR: 'Marketing par inscription', FA: 'تبلیغات هر ملک' },
        items: [
          { name: { EN: 'Professional Photos / Video Tour', FR: 'Photos professionnelles / visite vidéo', FA: 'عکاسی حرفه‌ای و تور ویدیویی' }, price: 250 },
          { name: { EN: 'Online Listing Boost / Ads', FR: 'Promotion en ligne / publicités', FA: 'تبلیغ آنلاین آگهی' }, price: 100 },
          { name: { EN: 'Signage & Printed Flyers', FR: 'Affichage et dépliants imprimés', FA: 'تابلو و بروشور چاپی' }, price: 80 },
        ],
      },
      {
        name: { EN: 'Client Costs Per Deal', FR: 'Frais client par transaction', FA: 'هزینه‌های مشتری هر معامله' },
        items: [
          { name: { EN: 'Closing Gift', FR: 'Cadeau de clôture', FA: 'هدیه تسویه معامله' }, price: 100 },
          { name: { EN: 'MLS / Board Fee Share', FR: 'Part des frais MLS', FA: 'سهم هزینه عضویت MLS' }, price: 40 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'rideshare_delivery',
    overheadPctOfDirectCost: 33, // suggested overhead as % of direct costs
    defaultPricingBasis: 'hour',
    icon: '🚕',
    name: { EN: 'Rideshare / Delivery Driver', FR: 'Covoiturage / Livreur', FA: 'راننده اسنپ/دلیوری (Uber/Lyft/DoorDash)' },
    items: [
      { label: { EN: 'Vehicle Fuel', FR: 'Carburant du véhicule', FA: 'سوخت خودرو' }, amount: 600 },
      { label: { EN: 'Vehicle Maintenance', FR: 'Entretien du véhicule', FA: 'تعمیر و نگهداری خودرو' }, amount: 200 },
      { label: { EN: 'Car Insurance', FR: 'Assurance automobile', FA: 'بیمه خودرو' }, amount: 300 },
      { label: { EN: 'Car Payment / Lease', FR: 'Paiement / Location du véhicule', FA: 'اقساط یا اجاره خودرو' }, amount: 500 },
      { label: { EN: 'Phone Plan / Data', FR: 'Forfait téléphonique / Données', FA: 'خط تلفن و اینترنت موبایل' }, amount: 60 },
      { label: { EN: 'Car Wash / Cleaning', FR: 'Lavage / Nettoyage', FA: 'کارواش و نظافت خودرو' }, amount: 60 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Vehicle Operating Cost (per hour driving)', FR: "Coût d'exploitation du véhicule (par heure)", FA: 'هزینه بهره‌برداری خودرو (هر ساعت)' },
        items: [
          { name: { EN: 'Fuel', FR: 'Carburant', FA: 'سوخت' }, price: 4.0 },
          { name: { EN: 'Vehicle Depreciation / Wear', FR: 'Amortissement du véhicule', FA: 'استهلاک خودرو' }, price: 2.5 },
        ],
      },
      {
        name: { EN: 'Consumables Per Hour', FR: 'Consommables par heure', FA: 'ملزومات به ازای هر ساعت' },
        items: [
          { name: { EN: 'Phone Data Plan (allocated)', FR: 'Forfait de données (alloué)', FA: 'سهم بسته اینترنت موبایل' }, price: 0.5 },
          { name: { EN: 'Car Wash / Interior Cleaning (allocated)', FR: 'Lavage auto (alloué)', FA: 'سهم کارواش' }, price: 0.5 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'cleaning_service',
    overheadPctOfDirectCost: 55, // suggested overhead as % of direct costs — folds in vacuum/mop wear (equipment depreciation)
    defaultPricingBasis: 'hour',
    icon: '🧹',
    name: { EN: 'Cleaning Service (Residential/Commercial)', FR: 'Service de nettoyage', FA: 'خدمات نظافتی (منزل/تجاری)' },
    items: [
      { label: { EN: 'Cleaning Supplies', FR: 'Produits de nettoyage', FA: 'مواد شوینده و نظافتی' }, amount: 300 },
      { label: { EN: 'Equipment (Vacuums, etc.)', FR: 'Équipement (aspirateurs, etc.)', FA: 'تجهیزات (جاروبرقی و غیره)' }, amount: 150 },
      { label: { EN: 'Vehicle / Transport', FR: 'Véhicule / Transport', FA: 'خودرو و رفت‌وآمد' }, amount: 250 },
      { label: { EN: 'Staff Wages', FR: 'Salaires du personnel', FA: 'حقوق کارکنان' }, amount: 2000 },
      { label: { EN: 'Insurance / Bonding', FR: 'Assurance / Cautionnement', FA: 'بیمه و ضمانت' }, amount: 150 },
      { label: { EN: 'Marketing', FR: 'Marketing', FA: 'تبلیغات' }, amount: 100 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Supplies Per Job', FR: 'Fournitures par contrat', FA: 'مواد مصرفی هر کار' },
        items: [
          { name: { EN: 'Cleaning Chemicals', FR: 'Produits chimiques de nettoyage', FA: 'مواد شیمیایی نظافتی' }, price: 3.0 },
          { name: { EN: 'Disposables (gloves, cloths, garbage bags)', FR: 'Jetables (gants, chiffons, sacs)', FA: 'یک‌بارمصرف (دستکش، پارچه، کیسه زباله)' }, price: 2.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'trucking',
    overheadPctOfDirectCost: 12, // suggested overhead as % of direct costs
    defaultPricingBasis: 'project',
    icon: '🚛',
    name: { EN: 'Trucking / Owner-Operator', FR: 'Camionnage / Propriétaire-exploitant', FA: 'کامیون‌داری / راننده مستقل' },
    items: [
      { label: { EN: 'Fuel', FR: 'Carburant', FA: 'سوخت' }, amount: 4000 },
      { label: { EN: 'Truck Payment / Lease', FR: 'Paiement / Location du camion', FA: 'اقساط یا اجاره کامیون' }, amount: 1800 },
      { label: { EN: 'Maintenance & Repairs', FR: 'Entretien et réparations', FA: 'تعمیر و نگهداری' }, amount: 800 },
      { label: { EN: 'Insurance', FR: 'Assurance', FA: 'بیمه' }, amount: 900 },
      { label: { EN: 'Permits & Licensing', FR: 'Permis et licences', FA: 'مجوزها و لایسنس' }, amount: 200 },
      { label: { EN: 'ELD / Dispatch Software', FR: 'Logiciel ELD / Répartition', FA: 'نرم‌افزار ELD و دیسپچ' }, amount: 100 },
    ],
    // "Per unit" here = one long-haul trip/load.
    recipeCategories: [
      {
        name: { EN: 'Fuel & Vehicle Costs (per trip)', FR: 'Carburant et frais du véhicule (par voyage)', FA: 'سوخت و هزینه‌های خودرو (هر سفر)' },
        items: [
          { name: { EN: 'Diesel Fuel', FR: 'Carburant diesel', FA: 'گازوئیل' }, price: 600 },
          { name: { EN: 'Tolls / Weigh Scale Fees', FR: 'Péages / frais de pesée', FA: 'عوارض جاده و ترازوی وزن' }, price: 40 },
          { name: { EN: 'Tire Wear / Oil Reserve', FR: "Usure des pneus / réserve d'huile", FA: 'استهلاک لاستیک و ذخیره روغن' }, price: 80 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'construction',
    overheadPctOfDirectCost: 12, // suggested overhead as % of direct costs
    defaultPricingBasis: 'project',
    icon: '🔨',
    name: { EN: 'Construction / Renovation Contractor', FR: 'Construction / Rénovation', FA: 'ساخت‌وساز / بازسازی' },
    items: [
      { label: { EN: 'Materials & Supplies', FR: 'Matériaux et fournitures', FA: 'مصالح و لوازم' }, amount: 4000 },
      { label: { EN: 'Tools & Equipment', FR: 'Outils et équipement', FA: 'ابزار و تجهیزات' }, amount: 500 },
      { label: { EN: 'Labour / Subcontractors', FR: 'Main-d\'œuvre / Sous-traitants', FA: 'نیروی کار و پیمانکاران فرعی' }, amount: 5000 },
      { label: { EN: 'Vehicle & Fuel', FR: 'Véhicule et carburant', FA: 'خودرو و سوخت' }, amount: 500 },
      { label: { EN: 'Insurance & WSIB', FR: 'Assurance et CSPAAT', FA: 'بیمه و WSIB' }, amount: 400 },
      { label: { EN: 'Permits', FR: 'Permis', FA: 'مجوزها' }, amount: 200 },
    ],
    // "Per unit" here = one renovation job (e.g. a bathroom reno).
    recipeCategories: [
      {
        name: { EN: 'Materials & Labour Per Job', FR: "Matériaux et main-d'œuvre par contrat", FA: 'مصالح و نیروی کار هر پروژه' },
        items: [
          { name: { EN: 'Lumber / Drywall / Framing', FR: 'Bois / Placoplâtre / Charpente', FA: 'چوب، گچ‌بری و اسکلت‌بندی' }, price: 800 },
          { name: { EN: 'Fixtures & Finishing Materials', FR: 'Accessoires et matériaux de finition', FA: 'شیرآلات و مصالح نازک‌کاری' }, price: 600 },
          { name: { EN: 'Subcontractor (electrician/plumber)', FR: 'Sous-traitant (électricien/plombier)', FA: 'پیمانکار فرعی (برق‌کار/لوله‌کش)' }, price: 1200 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'hair_salon',
    overheadPctOfDirectCost: 15, // suggested overhead as % of direct costs
    defaultPricingBasis: 'quantity',
    icon: '💈',
    name: { EN: 'Hair Salon / Barber', FR: 'Salon de coiffure / Barbier', FA: 'آرایشگاه / سلمانی' },
    items: [
      { label: { EN: 'Rent / Chair Rental', FR: 'Loyer / Location de chaise', FA: 'اجاره محل یا صندلی' }, amount: 1200 },
      { label: { EN: 'Product Supplies', FR: 'Produits', FA: 'مواد و لوازم مصرفی' }, amount: 500 },
      { label: { EN: 'Utilities', FR: 'Services publics', FA: 'قبوض' }, amount: 250 },
      { label: { EN: 'Marketing', FR: 'Marketing', FA: 'تبلیغات' }, amount: 150 },
      { label: { EN: 'Licensing', FR: 'Permis', FA: 'مجوز کسب' }, amount: 80 },
      { label: { EN: 'Equipment Maintenance', FR: 'Entretien de l\'équipement', FA: 'نگهداری تجهیزات' }, amount: 100 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Product Usage Per Service', FR: 'Produits utilisés par service', FA: 'مصرف مواد هر سرویس' },
        items: [
          { name: { EN: 'Shampoo & Conditioner', FR: 'Shampoing et revitalisant', FA: 'شامپو و نرم‌کننده' }, price: 1.5 },
          { name: { EN: 'Styling Product / Color', FR: 'Produit coiffant / Couleur', FA: 'محصول حالت‌دهنده یا رنگ' }, price: 3.0 },
        ],
      },
      {
        name: { EN: 'Consumables', FR: 'Consommables', FA: 'ملزومات مصرفی' },
        items: [
          { name: { EN: 'Cape, Towels & Gloves (laundering/wear)', FR: 'Cape, serviettes et gants (usure)', FA: 'روپوش، حوله و دستکش (استهلاک)' }, price: 1.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'nail_salon',
    overheadPctOfDirectCost: 15, // suggested overhead as % of direct costs
    defaultPricingBasis: 'quantity',
    icon: '💅',
    name: { EN: 'Nail Salon / Esthetics', FR: 'Salon de manucure / Esthétique', FA: 'سالن ناخن / زیبایی' },
    items: [
      { label: { EN: 'Product Supplies (Polish, Gel, etc.)', FR: 'Produits (vernis, gel, etc.)', FA: 'مواد مصرفی (لاک، ژل و غیره)' }, amount: 400 },
      { label: { EN: 'Rent', FR: 'Loyer', FA: 'اجاره محل' }, amount: 1200 },
      { label: { EN: 'Utilities', FR: 'Services publics', FA: 'قبوض' }, amount: 200 },
      { label: { EN: 'Sanitation Supplies', FR: 'Fournitures de désinfection', FA: 'لوازم استریل و بهداشتی' }, amount: 100 },
      { label: { EN: 'Marketing', FR: 'Marketing', FA: 'تبلیغات' }, amount: 100 },
      { label: { EN: 'Licensing', FR: 'Permis', FA: 'مجوز کسب' }, amount: 80 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Product Usage Per Service', FR: 'Produits utilisés par service', FA: 'مصرف مواد هر سرویس' },
        items: [
          { name: { EN: 'Polish / Gel / Acrylic', FR: 'Vernis / Gel / Acrylique', FA: 'لاک / ژل / آکریلیک' }, price: 4.0 },
          { name: { EN: 'Cuticle Oil & Lotion', FR: 'Huile et lotion pour cuticules', FA: 'روغن و لوسیون پوست ناخن' }, price: 0.8 },
        ],
      },
      {
        name: { EN: 'Consumables', FR: 'Consommables', FA: 'ملزومات مصرفی' },
        items: [
          { name: { EN: 'Files, Buffers & Disposable Liners', FR: 'Limes, polissoirs et protections jetables', FA: 'سوهان، بافر و روکش یک‌بارمصرف' }, price: 1.5 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'convenience_store',
    overheadPctOfDirectCost: 12, // suggested overhead as % of direct costs
    defaultPricingBasis: 'quantity',
    icon: '🏪',
    name: { EN: 'Convenience Store / Retail Shop', FR: 'Dépanneur / Commerce de détail', FA: 'سوپرمارکت / مغازه خرده‌فروشی' },
    items: [
      { label: { EN: 'Inventory Purchases', FR: 'Achats de stock', FA: 'خرید کالا و موجودی' }, amount: 6000 },
      { label: { EN: 'Rent', FR: 'Loyer', FA: 'اجاره محل' }, amount: 2500 },
      { label: { EN: 'Utilities', FR: 'Services publics', FA: 'قبوض' }, amount: 500 },
      { label: { EN: 'Staff Wages', FR: 'Salaires du personnel', FA: 'حقوق کارکنان' }, amount: 2500 },
      { label: { EN: 'POS / Software', FR: 'Point de vente / Logiciel', FA: 'دستگاه و نرم‌افزار فروش (POS)' }, amount: 100 },
      { label: { EN: 'Insurance', FR: 'Assurance', FA: 'بیمه' }, amount: 200 },
    ],
    // "Per unit" here = one typical item sold (adjust to your actual product mix).
    recipeCategories: [
      {
        name: { EN: 'Cost of Goods (per unit sold)', FR: 'Coût des marchandises (par unité vendue)', FA: 'بهای تمام‌شده کالا (هر واحد فروش)' },
        items: [
          { name: { EN: 'Wholesale Purchase Price', FR: "Prix d'achat en gros", FA: 'قیمت خرید عمده' }, price: 2.0 },
        ],
      },
      {
        name: { EN: 'Packaging', FR: 'Emballage', FA: 'بسته‌بندی' },
        items: [
          { name: { EN: 'Bags / Receipt Paper', FR: 'Sacs / papier de reçu', FA: 'کیسه و رول فیش' }, price: 0.1 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'import_export',
    overheadPctOfDirectCost: 8, // suggested overhead as % of direct costs
    defaultPricingBasis: 'quantity',
    icon: '📦',
    name: { EN: 'Import / Export Trading', FR: 'Commerce import/export', FA: 'واردات و صادرات' },
    items: [
      { label: { EN: 'Inventory / Goods Purchase', FR: 'Achat de marchandises', FA: 'خرید کالا' }, amount: 8000 },
      { label: { EN: 'Shipping & Freight', FR: 'Expédition et fret', FA: 'حمل‌ونقل و باربری' }, amount: 2000 },
      { label: { EN: 'Customs & Duties', FR: 'Douanes et droits', FA: 'گمرک و عوارض' }, amount: 1000 },
      { label: { EN: 'Warehousing', FR: 'Entreposage', FA: 'انبارداری' }, amount: 800 },
      { label: { EN: 'Cargo Insurance', FR: 'Assurance cargaison', FA: 'بیمه محموله' }, amount: 300 },
      { label: { EN: 'Marketing / Trade Shows', FR: 'Marketing / Salons professionnels', FA: 'تبلیغات و نمایشگاه‌های تجاری' }, amount: 300 },
    ],
    // "Per unit" here = one imported unit/case of goods.
    recipeCategories: [
      {
        name: { EN: 'Product Cost Per Unit', FR: 'Coût du produit par unité', FA: 'بهای کالا هر واحد' },
        items: [
          { name: { EN: 'Supplier / Factory Price', FR: "Prix du fournisseur / de l'usine", FA: 'قیمت تأمین‌کننده/کارخانه' }, price: 5.0 },
        ],
      },
      {
        name: { EN: 'Shipping & Customs Per Unit', FR: 'Expédition et douanes par unité', FA: 'حمل و گمرک هر واحد' },
        items: [
          { name: { EN: 'Freight (allocated)', FR: 'Fret (alloué)', FA: 'سهم هزینه حمل' }, price: 1.5 },
          { name: { EN: 'Customs Duty / Brokerage Fee', FR: 'Droits de douane / frais de courtage', FA: 'عوارض گمرکی و کارمزد ترخیص' }, price: 0.8 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'it_consulting',
    overheadPctOfDirectCost: 50, // suggested overhead as % of direct costs — folds in allocated internet/equipment cost
    defaultPricingBasis: 'hour',
    icon: '🖥️',
    name: { EN: 'IT / Software Consulting', FR: 'Consultation informatique/logicielle', FA: 'مشاوره IT / نرم‌افزار' },
    items: [
      { label: { EN: 'Software Licenses / Tools', FR: 'Licences / outils logiciels', FA: 'لایسنس و ابزار نرم‌افزاری' }, amount: 150 },
      { label: { EN: 'Cloud Hosting', FR: 'Hébergement infonuagique', FA: 'هاست و سرور ابری' }, amount: 100 },
      { label: { EN: 'Internet', FR: 'Internet', FA: 'اینترنت' }, amount: 80 },
      { label: { EN: 'Marketing / Website', FR: 'Marketing / Site web', FA: 'تبلیغات و وب‌سایت' }, amount: 100 },
      { label: { EN: 'Professional Development / Certs', FR: 'Développement professionnel / Certifications', FA: 'آموزش و مدارک تخصصی' }, amount: 150 },
      { label: { EN: 'Subcontractor Fees', FR: 'Frais de sous-traitance', FA: 'هزینه پیمانکار فرعی' }, amount: 500 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Tools Allocated Per Hour', FR: "Outils alloués par heure", FA: 'سهم ابزار به ازای هر ساعت' },
        items: [
          { name: { EN: 'Software Licenses (per hour)', FR: 'Licences logicielles (par heure)', FA: 'لایسنس نرم‌افزار (هر ساعت)' }, price: 1.5 },
          { name: { EN: 'Cloud Hosting / Servers (per hour)', FR: 'Hébergement infonuagique (par heure)', FA: 'سهم هاست و سرور (هر ساعت)' }, price: 1.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'photography',
    overheadPctOfDirectCost: 68, // suggested overhead as % of direct costs — folds in allocated editing-software cost
    defaultPricingBasis: 'project',
    icon: '📷',
    name: { EN: 'Photography / Videography', FR: 'Photographie / Vidéographie', FA: 'عکاسی / فیلم‌برداری' },
    items: [
      { label: { EN: 'Equipment & Gear', FR: 'Équipement et matériel', FA: 'تجهیزات و لوازم' }, amount: 300 },
      { label: { EN: 'Editing Software Subscriptions', FR: 'Abonnements logiciels de montage', FA: 'اشتراک نرم‌افزار ویرایش' }, amount: 60 },
      { label: { EN: 'Studio Rent', FR: 'Location de studio', FA: 'اجاره استودیو' }, amount: 500 },
      { label: { EN: 'Marketing / Portfolio Site', FR: 'Marketing / Site portfolio', FA: 'تبلیغات و سایت نمونه‌کار' }, amount: 100 },
      { label: { EN: 'Vehicle & Travel', FR: 'Véhicule et déplacements', FA: 'خودرو و رفت‌وآمد' }, amount: 200 },
      { label: { EN: 'Equipment Insurance', FR: 'Assurance équipement', FA: 'بیمه تجهیزات' }, amount: 100 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Equipment Wear Per Shoot', FR: "Usure de l'équipement par séance", FA: 'استهلاک تجهیزات هر جلسه' },
        items: [
          { name: { EN: 'Camera / Lens Depreciation', FR: "Amortissement caméra / objectif", FA: 'استهلاک دوربین و لنز' }, price: 15.0 },
          { name: { EN: 'Memory Cards / Backup Storage', FR: 'Cartes mémoire / stockage de sauvegarde', FA: 'کارت حافظه و بک‌آپ' }, price: 3.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'childcare',
    overheadPctOfDirectCost: 15, // suggested overhead as % of direct costs
    defaultPricingBasis: 'hour',
    icon: '🧸',
    name: { EN: 'Childcare / Daycare Provider', FR: 'Garderie', FA: 'مهدکودک / نگهداری کودک' },
    items: [
      { label: { EN: 'Supplies & Toys', FR: 'Fournitures et jouets', FA: 'لوازم و اسباب‌بازی' }, amount: 200 },
      { label: { EN: 'Food & Snacks', FR: 'Nourriture et collations', FA: 'غذا و میان‌وعده' }, amount: 300 },
      { label: { EN: 'Licensing & Certification', FR: 'Permis et certification', FA: 'مجوز و گواهینامه' }, amount: 150 },
      { label: { EN: 'Liability Insurance', FR: 'Assurance responsabilité', FA: 'بیمه مسئولیت' }, amount: 200 },
      { label: { EN: 'Facility Rent / Utilities', FR: 'Loyer / Services publics', FA: 'اجاره و قبوض محل' }, amount: 800 },
      { label: { EN: 'Marketing', FR: 'Marketing', FA: 'تبلیغات' }, amount: 50 },
    ],
    // "Per unit" here = one child, one day.
    recipeCategories: [
      {
        name: { EN: 'Food & Supplies Per Child Per Day', FR: "Nourriture et fournitures par enfant par jour", FA: 'غذا و لوازم هر کودک در روز' },
        items: [
          { name: { EN: 'Meals & Snacks', FR: 'Repas et collations', FA: 'غذا و میان‌وعده' }, price: 6.0 },
          { name: { EN: 'Craft / Activity Supplies', FR: "Fournitures d'activités", FA: 'لوازم بازی و فعالیت' }, price: 1.5 },
        ],
      },
      {
        name: { EN: 'Consumables', FR: 'Consommables', FA: 'ملزومات مصرفی' },
        items: [
          { name: { EN: 'Diapers / Wipes (if applicable)', FR: 'Couches / lingettes (le cas échéant)', FA: 'پوشک و دستمال (در صورت نیاز)' }, price: 3.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'landscaping',
    overheadPctOfDirectCost: 30, // suggested overhead as % of direct costs — folds in blade sharpening/trimmer-line wear (equipment depreciation)
    defaultPricingBasis: 'area',
    icon: '🌿',
    name: { EN: 'Landscaping / Lawn Care', FR: 'Aménagement paysager', FA: 'باغبانی / نگهداری چمن' },
    items: [
      { label: { EN: 'Equipment (Mowers, Trimmers)', FR: 'Équipement (tondeuses, taille-bordures)', FA: 'تجهیزات (چمن‌زن و تریمر)' }, amount: 300 },
      { label: { EN: 'Fuel', FR: 'Carburant', FA: 'سوخت' }, amount: 300 },
      { label: { EN: 'Materials (Seed, Mulch, etc.)', FR: 'Matériaux (semences, paillis, etc.)', FA: 'مصالح (بذر، کود و غیره)' }, amount: 400 },
      { label: { EN: 'Vehicle Maintenance', FR: 'Entretien du véhicule', FA: 'تعمیر و نگهداری خودرو' }, amount: 200 },
      { label: { EN: 'Insurance', FR: 'Assurance', FA: 'بیمه' }, amount: 200 },
      { label: { EN: 'Marketing / Flyers', FR: 'Marketing / Dépliants', FA: 'تبلیغات و بروشور' }, amount: 100 },
    ],
    // "Per unit" here = a typical residential lawn job.
    recipeCategories: [
      {
        name: { EN: 'Materials Per Job', FR: 'Matériaux par contrat', FA: 'مصالح هر کار' },
        items: [
          { name: { EN: 'Fuel (mower/trimmer)', FR: 'Carburant (tondeuse/taille-bordures)', FA: 'سوخت (چمن‌زن/تریمر)' }, price: 5.0 },
          { name: { EN: 'Seed / Mulch / Fertilizer', FR: 'Semences / paillis / engrais', FA: 'بذر، کود و مالچ' }, price: 8.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'handyman',
    overheadPctOfDirectCost: 28, // suggested overhead as % of direct costs — folds in power-tool depreciation
    defaultPricingBasis: 'project',
    icon: '🛠️',
    name: { EN: 'Handyman / Repair Services', FR: 'Bricoleur / Services de réparation', FA: 'تعمیرکار / خدمات فنی' },
    items: [
      { label: { EN: 'Tools & Equipment', FR: 'Outils et équipement', FA: 'ابزار و تجهیزات' }, amount: 300 },
      { label: { EN: 'Materials & Parts', FR: 'Matériaux et pièces', FA: 'قطعات و مصالح' }, amount: 600 },
      { label: { EN: 'Vehicle & Fuel', FR: 'Véhicule et carburant', FA: 'خودرو و سوخت' }, amount: 350 },
      { label: { EN: 'Liability Insurance', FR: 'Assurance responsabilité', FA: 'بیمه مسئولیت' }, amount: 200 },
      { label: { EN: 'Marketing', FR: 'Marketing', FA: 'تبلیغات' }, amount: 100 },
      { label: { EN: 'Licensing / Permits', FR: 'Permis', FA: 'مجوزها' }, amount: 80 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Materials & Parts Per Job', FR: 'Matériaux et pièces par contrat', FA: 'قطعات و مصالح هر کار' },
        items: [
          { name: { EN: 'Replacement Parts / Hardware', FR: 'Pièces de rechange / quincaillerie', FA: 'قطعات یدکی و لوازم' }, price: 40.0 },
          { name: { EN: 'Fasteners, Sealant, Small Materials', FR: 'Fixations, scellant, petits matériaux', FA: 'پیچ و مهره، درزگیر و مواد جزئی' }, price: 10.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'home_based_food',
    overheadPctOfDirectCost: 15, // suggested overhead as % of direct costs
    defaultPricingBasis: 'weight',
    icon: '🍰',
    name: { EN: 'Home-Based Food / Homemade Sweets', FR: 'Cuisine maison / Pâtisseries artisanales', FA: 'غذا و شیرینی خانگی' },
    items: [
      { label: { EN: 'Ingredients & Raw Materials', FR: 'Ingrédients et matières premières', FA: 'مواد اولیه' }, amount: 600 },
      { label: { EN: 'Packaging & Containers', FR: 'Emballage et contenants', FA: 'بسته‌بندی و ظروف' }, amount: 150 },
      { label: { EN: 'Delivery & Transport', FR: 'Livraison et transport', FA: 'ارسال و پیک' }, amount: 150 },
      { label: { EN: 'Home Kitchen Permit / Inspection', FR: 'Permis de cuisine à domicile / Inspection', FA: 'مجوز غذای خانگی و بازرسی بهداشت' }, amount: 100 },
      { label: { EN: 'Social Media Marketing', FR: 'Marketing sur les réseaux sociaux', FA: 'تبلیغات در شبکه‌های اجتماعی' }, amount: 100 },
      { label: { EN: 'Kitchen Equipment', FR: 'Équipement de cuisine', FA: 'تجهیزات آشپزخانه' }, amount: 150 },
    ],
    // Example: one batch of cream pastries (شیرینی خامه‌ای) yielding
    // roughly 2kg — realistic Canadian grocery prices, per-batch (not
    // monthly). The person edits every number to match their own recipe
    // and local prices; this is just a sane, non-zero starting point.
    recipeCategories: [
      {
        name: { EN: 'Ingredients', FR: 'Ingrédients', FA: 'مواد اولیه' },
        items: [
          { name: { EN: 'Flour', FR: 'Farine', FA: 'آرد' }, price: 1.5 },
          { name: { EN: 'Sugar', FR: 'Sucre', FA: 'شکر' }, price: 1.2 },
          { name: { EN: 'Butter', FR: 'Beurre', FA: 'کره' }, price: 3.5 },
          { name: { EN: 'Whipping Cream', FR: 'Crème à fouetter', FA: 'خامه' }, price: 4.5 },
          { name: { EN: 'Eggs', FR: 'Œufs', FA: 'تخم‌مرغ' }, price: 2.0 },
          { name: { EN: 'Vanilla / Flavoring', FR: 'Vanille / Arôme', FA: 'وانیل / اسانس' }, price: 0.8 },
        ],
      },
      {
        name: { EN: 'Packaging', FR: 'Emballage', FA: 'بسته‌بندی' },
        items: [
          { name: { EN: 'Boxes', FR: 'Boîtes', FA: 'جعبه' }, price: 1.5 },
          { name: { EN: 'Decorative Ribbon / Liner', FR: 'Ruban décoratif / Papier', FA: 'روبان / زیرکاغذی تزیین' }, price: 0.5 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'home_tailoring',
    overheadPctOfDirectCost: 12, // suggested overhead as % of direct costs
    defaultPricingBasis: 'quantity',
    icon: '🧵',
    name: { EN: 'Alterations / Home Tailoring', FR: 'Retouches / Couture à domicile', FA: 'خیاطی و تعمیرات لباس خانگی' },
    items: [
      { label: { EN: 'Fabric & Sewing Supplies', FR: 'Tissus et fournitures de couture', FA: 'پارچه و لوازم خیاطی' }, amount: 300 },
      { label: { EN: 'Sewing Machine Maintenance', FR: 'Entretien de la machine à coudre', FA: 'تعمیر و نگهداری چرخ خیاطی' }, amount: 80 },
      { label: { EN: 'Thread / Notions / Zippers', FR: 'Fil / Accessoires / Fermetures éclair', FA: 'نخ، زیپ و لوازم جانبی' }, amount: 100 },
      { label: { EN: 'Delivery / Transport', FR: 'Livraison / Transport', FA: 'ارسال و رفت‌وآمد' }, amount: 100 },
      { label: { EN: 'Marketing (Social Media / Flyers)', FR: 'Marketing (réseaux sociaux / dépliants)', FA: 'تبلیغات (شبکه‌های اجتماعی و بروشور)' }, amount: 80 },
      { label: { EN: 'Home Business Permit', FR: "Permis d'entreprise à domicile", FA: 'مجوز کسب‌وکار خانگی' }, amount: 60 },
    ],
    // "Per unit" here = one garment/alteration job.
    recipeCategories: [
      {
        name: { EN: 'Materials Per Garment', FR: 'Matériaux par vêtement', FA: 'مواد اولیه هر لباس' },
        items: [
          { name: { EN: 'Fabric (if supplied by you)', FR: 'Tissu (si fourni par vous)', FA: 'پارچه (در صورت تأمین توسط شما)' }, price: 8.0 },
          { name: { EN: 'Thread, Zippers, Buttons', FR: 'Fil, fermetures éclair, boutons', FA: 'نخ، زیپ و دکمه' }, price: 2.0 },
        ],
      },
      {
        name: { EN: 'Consumables', FR: 'Consommables', FA: 'ملزومات مصرفی' },
        items: [
          { name: { EN: 'Interfacing / Lining', FR: 'Entoilage / doublure', FA: 'چسب و آستری' }, price: 1.5 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'private_tutor',
    overheadPctOfDirectCost: 90, // suggested overhead as % of direct costs — folds in allocated video-platform subscription
    defaultPricingBasis: 'hour',
    icon: '📚',
    name: { EN: 'Private Tutor / Language & Music Teacher', FR: 'Tuteur privé / Professeur de langue et musique', FA: 'معلم خصوصی / تدریس زبان و موسیقی' },
    items: [
      { label: { EN: 'Teaching Materials & Books', FR: "Matériel pédagogique et livres", FA: 'منابع آموزشی و کتاب' }, amount: 100 },
      { label: { EN: 'Online Platform / Software', FR: 'Plateforme / logiciel en ligne', FA: 'نرم‌افزار و پلتفرم آنلاین (زوم و غیره)' }, amount: 50 },
      { label: { EN: 'Marketing / Website', FR: 'Marketing / Site web', FA: 'تبلیغات و وب‌سایت' }, amount: 80 },
      { label: { EN: 'Transport (In-Person Lessons)', FR: 'Transport (leçons en personne)', FA: 'رفت‌وآمد (کلاس حضوری)' }, amount: 150 },
      { label: { EN: 'Instrument Maintenance', FR: "Entretien de l'instrument", FA: 'نگهداری ساز موسیقی' }, amount: 50 },
      { label: { EN: 'Professional Development / Certification', FR: 'Développement professionnel / Certification', FA: 'آموزش و مدرک حرفه‌ای' }, amount: 100 },
    ],
    recipeCategories: [
      {
        name: { EN: 'Materials Per Lesson', FR: 'Matériel par leçon', FA: 'منابع هر جلسه' },
        items: [
          { name: { EN: 'Worksheets / Printed Materials', FR: "Fiches d'exercices / matériel imprimé", FA: 'برگه تمرین و منابع چاپی' }, price: 1.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
  {
    id: 'bridal_makeup',
    overheadPctOfDirectCost: 15, // suggested overhead as % of direct costs
    defaultPricingBasis: 'project',
    icon: '💄',
    name: { EN: 'Bridal / Event Makeup & Henna Artist', FR: 'Maquillage de mariage/événement et henné', FA: 'آرایشگری عروس و مجالس / حنا' },
    items: [
      { label: { EN: 'Makeup & Beauty Products', FR: 'Produits de maquillage et de beauté', FA: 'لوازم آرایش و زیبایی' }, amount: 400 },
      { label: { EN: 'Henna Supplies', FR: 'Fournitures de henné', FA: 'مواد و لوازم حنا' }, amount: 80 },
      { label: { EN: 'Travel / Mobile Service Transport', FR: 'Déplacement / Service mobile', FA: 'رفت‌وآمد و خدمات سیار' }, amount: 200 },
      { label: { EN: 'Marketing (Instagram / Portfolio)', FR: 'Marketing (Instagram / Portfolio)', FA: 'تبلیغات (اینستاگرام و نمونه‌کار)' }, amount: 150 },
      { label: { EN: 'Equipment (Lighting, Mirrors, Kits)', FR: "Équipement (éclairage, miroirs, trousses)", FA: 'تجهیزات (نورپردازی، آینه، کیف کار)' }, amount: 150 },
      { label: { EN: 'Licensing / Insurance', FR: 'Permis / Assurance', FA: 'مجوز و بیمه' }, amount: 100 },
    ],
    // "Per unit" here = one client/event (e.g. one bride or one guest).
    recipeCategories: [
      {
        name: { EN: 'Makeup Products Per Face', FR: 'Produits de maquillage par visage', FA: 'مواد آرایشی هر چهره' },
        items: [
          { name: { EN: 'Foundation, Eyeshadow, Lashes, etc.', FR: 'Fond de teint, ombre à paupières, cils, etc.', FA: 'کرم پودر، سایه، مژه مصنوعی و غیره' }, price: 15.0 },
        ],
      },
      {
        name: { EN: 'Henna Supplies Per Client (if applicable)', FR: 'Fournitures de henné par client', FA: 'مواد حنا هر مشتری (در صورت نیاز)' },
        items: [
          { name: { EN: 'Henna Cones / Paste', FR: 'Cônes / pâte de henné', FA: 'کیسه و خمیر حنا' }, price: 5.0 },
        ],
      },
      {
        name: { EN: 'Hidden Costs (often forgotten)', FR: 'Coûts cachés (souvent oubliés)', FA: 'هزینه‌های پنهان (معمولاً یادشون میره)' },
        items: [],
      },
    ],
  },
];
