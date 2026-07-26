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
  recipeCategories?: RecipeCategory[];
}

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'restaurant',
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
  },
  {
    id: 'mobile_car_wash',
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
  },
  {
    id: 'freelancer',
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
  },
  {
    id: 'real_estate',
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
  },
  {
    id: 'rideshare_delivery',
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
  },
  {
    id: 'cleaning_service',
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
  },
  {
    id: 'trucking',
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
  },
  {
    id: 'construction',
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
  },
  {
    id: 'hair_salon',
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
  },
  {
    id: 'nail_salon',
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
  },
  {
    id: 'convenience_store',
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
  },
  {
    id: 'import_export',
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
  },
  {
    id: 'it_consulting',
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
  },
  {
    id: 'photography',
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
  },
  {
    id: 'childcare',
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
  },
  {
    id: 'landscaping',
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
  },
  {
    id: 'handyman',
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
  },
  {
    id: 'home_based_food',
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
        items: [
          { name: { EN: 'Oven / Mixer (electricity share)', FR: 'Four / Batteur (part électricité)', FA: 'برق فر و همزن (سهمی)' }, price: 1.0 },
          { name: { EN: 'Delivery / Your Travel Time', FR: 'Livraison / Temps de déplacement', FA: 'رفت‌وآمد یا هزینه‌ی ارسال' }, price: 2.0 },
        ],
      },
    ],
  },
  {
    id: 'home_tailoring',
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
  },
  {
    id: 'private_tutor',
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
  },
  {
    id: 'bridal_makeup',
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
  },
];
