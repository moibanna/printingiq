import type { Localized } from './i18n';

export type Unit = 'sheet' | 'm2' | 'roll' | 'piece' | 'box' | 'pack' | 'kg' | 'liter';
export const UNITS: Unit[] = ['sheet', 'm2', 'roll', 'piece', 'box', 'pack', 'kg', 'liter'];
export type Currency = 'IQD' | 'USD';
export type Availability = 'in_stock' | 'out_of_stock' | 'custom_order';
export const AVAILABILITY: Availability[] = ['in_stock', 'custom_order', 'out_of_stock'];

/** Two levels: a few main groups, each with subcategories. Products point at a subcategory id. */
export type Group = { id: string; tint: string; name: Localized };
export type Category = { id: string; group: string; name: Localized };

export const GROUPS: Group[] = [
  { id: 'sign', tint: '#E3EDFB', name: { en: 'Sign & print materials', ar: 'مواد الدعاية والطباعة', ckb: 'کەرەستەی ڕیکلام و چاپ' } },
  { id: 'machines', tint: '#DDF3EC', name: { en: 'Machines & equipment', ar: 'المكائن والمعدات', ckb: 'ئامێر و کەرەستە' } },
  { id: 'ink', tint: '#ECE6FF', name: { en: 'Inks & consumables', ar: 'الأحبار والمستلزمات', ckb: 'مەرەکەب و پێداویستی' } },
  { id: 'services', tint: '#FFF1E0', name: { en: 'Printing services', ar: 'خدمات الطباعة', ckb: 'خزمەتگوزاری چاپ' } },
  { id: 'stationery', tint: '#FFF7CC', name: { en: 'Stationery & office', ar: 'القرطاسية والمكتب', ckb: 'قرتاسیە و ئۆفیس' } },
  { id: 'promo', tint: '#FDE7EF', name: { en: 'Promotional & gifts', ar: 'الهدايا والدعاية', ckb: 'دیاری و پرۆمۆشن' } },
  { id: 'awards', tint: '#FFF0D1', name: { en: 'Awards & medals', ar: 'الدروع والميداليات', ckb: 'خەڵات و مەدالیا' } },
  { id: 'apparel', tint: '#E4F2FF', name: { en: 'Clothing & bags', ar: 'الملابس والحقائب', ckb: 'جل و جانتا' } },
];

const c = (group: string, id: string, en: string, ar: string, ckb: string): Category => ({ id, group, name: { en, ar, ckb } });

export const CATEGORIES: Category[] = [
  // Sign & print materials
  c('sign', 'acrylic', 'Acrylic sheets', 'ألواح أكريليك', 'ئەکریلیک'),
  c('sign', 'foam', 'Foam & PVC board', 'فوم بورد و PVC', 'فۆم و PVC'),
  c('sign', 'acp', 'Alucobond (ACP)', 'ألكوبوند', 'ئەلەکوبۆند'),
  c('sign', 'flex', 'Flex banner', 'فليكس', 'فلێکس'),
  c('sign', 'vinyl', 'Stickers & vinyl', 'ستيكر وفينيل', 'ستیکەر و ڤینایل'),
  c('sign', 'paper', 'Paper & cardboard', 'ورق وكارتون', 'کاغەز و کارتۆن'),
  c('sign', 'led', 'LED, light boxes & power supplies', 'ليد وصناديق ضوئية ومحولات', 'LED، لایت بۆکس و پاوەر'),
  c('sign', 'stands', 'Roll-ups & display stands', 'رول أب وستاندات عرض', 'ڕۆڵ ئەپ و ستاند'),
  c('sign', 'menu-stand', 'Table & menu stands', 'ستاند طاولة ومنيو', 'ستاندی مێز و مێنیو'),
  c('sign', 'door-sign', 'Door signs & name plates', 'لوحات أبواب', 'ناونیشانی سەردەرگا'),
  // Machines
  c('machines', 'large-format', 'Large-format printers', 'طابعات الفليكس والإعلان', 'چاپکەری فۆرماتی گەورە'),
  c('machines', 'uv-printer', 'UV printers', 'طابعات UV', 'چاپکەری UV'),
  c('machines', 'laser-cnc', 'Laser & CNC machines', 'مكائن ليزر و CNC', 'ئامێری لەیزەر و CNC'),
  c('machines', 'plotter', 'Cutting plotters', 'بلوتر قص', 'پلۆتەری بڕین'),
  c('machines', 'heat-press', 'Sublimation & heat press', 'مكائن سبلميشن وكبس حراري', 'سەبلیمەیشن و پرێسی گەرم'),
  c('machines', 'office-print', 'Digital presses & copiers', 'طابعات رقمية واستنساخ', 'چاپکەری دیجیتاڵ و کۆپی'),
  c('machines', 'screens', 'Digital signage screens', 'شاشات إعلانية', 'شاشەی ڕیکلام'),
  c('machines', 'tools', 'Tools & spare parts', 'أدوات وقطع غيار', 'ئامراز و پارچەی یەدەگ'),
  // Inks & consumables
  c('ink', 'solvent-ink', 'Solvent & eco-solvent ink', 'حبر سولفنت وإيكو سولفنت', 'مەرەکەبی سۆڵڤێنت'),
  c('ink', 'uv-ink', 'UV ink', 'حبر UV', 'مەرەکەبی UV'),
  c('ink', 'sublimation-ink', 'Sublimation ink & paper', 'حبر وورق سبلميشن', 'مەرەکەب و کاغەزی سەبلیمەیشن'),
  c('ink', 'toner', 'Toner & cartridges', 'تونر وخراطيش', 'تۆنەر و کارتریج'),
  c('ink', 'lamination', 'Lamination film', 'رول سلفنة', 'فیلمی لامینەیشن'),
  // Printing services
  c('services', 'business-cards', 'Business cards', 'كروت شخصية', 'کارتی بازرگانی'),
  c('services', 'flyers', 'Flyers & brochures', 'فلايرات وبروشورات', 'فلایەر و بڕۆشوور'),
  c('services', 'banner-print', 'Banner & poster printing', 'طباعة بنرات وبوسترات', 'چاپی بانەر و پۆستەر'),
  c('services', 'packaging', 'Boxes & packaging', 'علب وتغليف', 'بۆکس و پاکێجینگ'),
  c('services', 'sticker-print', 'Label & sticker printing', 'طباعة ليبل وستيكر', 'چاپی لەیبڵ و ستیکەر'),
  // Stationery & office
  c('stationery', 'pens', 'Pens', 'أقلام', 'قەڵەم'),
  c('stationery', 'notebooks', 'Notebooks & agendas', 'دفاتر وأجندات', 'دەفتەر و ئەجێندا'),
  c('stationery', 'folders', 'Folders & files', 'فولدرات وملفات', 'فۆڵدەر و فایل'),
  c('stationery', 'office-paper', 'A4 & copy paper', 'ورق A4 واستنساخ', 'کاغەزی A4 و کۆپی'),
  c('stationery', 'calculators', 'Calculators', 'آلات حاسبة', 'حاسیبە'),
  c('stationery', 'pen-box', 'Pen boxes & desk sets', 'علب أقلام وأطقم مكتب', 'بۆکسی قەڵەم و سێتی مێز'),
  c('stationery', 'card-holder', 'Business card & ID holders', 'حافظات كروت وباجات', 'هەڵگری کارت و ئایدی'),
  c('stationery', 'certificate-holder', 'Certificate holders', 'حافظات شهادات', 'هەڵگری بڕوانامە'),
  c('stationery', 'office-supplies', 'Office supplies', 'مستلزمات مكتبية', 'پێداویستی ئۆفیس'),
  // Promotional & gifts
  c('promo', 'mugs', 'Mugs & cups', 'أكواب', 'کوپ'),
  c('promo', 'thermos', 'Thermos & bottles', 'ترامس وقناني', 'مەتارە'),
  c('promo', 'keychains', 'Keychains', 'ميداليات مفاتيح', 'کلیلەدان'),
  c('promo', 'flash', 'Flash memory', 'فلاش ميموري', 'فلاش میمۆری'),
  c('promo', 'powerbank', 'Power banks & mobile', 'باور بانك وإكسسوارات موبايل', 'پاوەربانک و مۆبایل'),
  c('promo', 'clocks', 'Clocks & calendars', 'ساعات وتقاويم', 'کاتژمێر و ڕۆژژمێر'),
  c('promo', 'gift-box', 'Gift boxes & VIP sets', 'علب وأطقم هدايا VIP', 'بۆکس و سێتی دیاری VIP'),
  c('promo', 'gift-bags', 'Gift & paper bags', 'أكياس هدايا وورقية', 'کیسی دیاری و کاغەز'),
  c('promo', 'frames', 'Photo frames', 'إطارات صور', 'چوارچێوەی وێنە'),
  c('promo', 'tissue-box', 'Tissue boxes', 'علب مناديل', 'بۆکسی کلینس'),
  c('promo', 'sunshade', 'Car sunshades', 'مظلات سيارة', 'سێبەری ئۆتۆمبێل'),
  c('promo', 'holographic', 'Holographic & special items', 'هولوغرام ومنتجات خاصة', 'هۆڵۆگرافیک و بابەتی تایبەت'),
  // Awards
  c('awards', 'crystal', 'Crystal awards', 'دروع كريستال', 'خەڵاتی کریستاڵ'),
  c('awards', 'wood-award', 'Wooden plaques', 'دروع خشبية', 'خەڵاتی دار'),
  c('awards', 'trophies', 'Trophies', 'كؤوس', 'جام'),
  c('awards', 'medals', 'Medals', 'ميداليات', 'مەدالیا'),
  c('awards', 'seals', 'Certificate seals & stickers', 'أختام وستيكرات شهادات', 'لەزگەی بڕوانامە'),
  // Clothing & bags
  c('apparel', 't-shirts', 'T-shirts & polos', 'تيشيرتات', 'تیشێرت'),
  c('apparel', 'hats', 'Hats & caps', 'قبعات', 'کڵاو'),
  c('apparel', 'vests', 'Vests & uniforms', 'سترات ويونيفورم', 'هێلەگ و یونیفۆرم'),
  c('apparel', 'bags', 'Bags & tote bags', 'حقائب وحقائب قماش', 'جانتا و توتباگ'),
  c('apparel', 'laptop-bags', 'Laptop bags', 'حقائب لابتوب', 'جانتای لاپتۆپ'),
];

export const groupById = (id: string) => GROUPS.find((g) => g.id === id);
export const categoryById = (id: string) => CATEGORIES.find((x) => x.id === id);
export const categoriesOf = (groupId: string) => CATEGORIES.filter((x) => x.group === groupId);
/** Tint for a product/subcategory comes from its group. */
export const tintOf = (categoryId: string) => groupById(categoryById(categoryId)?.group ?? '')?.tint ?? '#EEF0F3';

/** Common sheet/vinyl colors with names in all three languages. */
export type ColorOption = { hex: string; name: Localized };
export const COLOR_PALETTE: ColorOption[] = [
  { hex: '#FFFFFF', name: { en: 'White', ar: 'أبيض', ckb: 'سپی' } },
  { hex: '#111111', name: { en: 'Black', ar: 'أسود', ckb: 'ڕەش' } },
  { hex: '#E5E7EB', name: { en: 'Clear', ar: 'شفاف', ckb: 'ڕوون' } },
  { hex: '#D7262E', name: { en: 'Red', ar: 'أحمر', ckb: 'سوور' } },
  { hex: '#1F5FD1', name: { en: 'Blue', ar: 'أزرق', ckb: 'شین' } },
  { hex: '#1E9E4A', name: { en: 'Green', ar: 'أخضر', ckb: 'سەوز' } },
  { hex: '#F5C400', name: { en: 'Yellow', ar: 'أصفر', ckb: 'زەرد' } },
  { hex: '#F07D19', name: { en: 'Orange', ar: 'برتقالي', ckb: 'پرتەقاڵی' } },
  { hex: '#7A3FC4', name: { en: 'Purple', ar: 'بنفسجي', ckb: 'مۆر' } },
  { hex: '#E86FA8', name: { en: 'Pink', ar: 'وردي', ckb: 'پەمەیی' } },
  { hex: '#8A5A33', name: { en: 'Brown', ar: 'بني', ckb: 'قاوەیی' } },
  { hex: '#9CA3AF', name: { en: 'Silver', ar: 'فضي', ckb: 'زیوی' } },
  { hex: '#C9A23A', name: { en: 'Gold', ar: 'ذهبي', ckb: 'ئاڵتوونی' } },
  { hex: '#BCE3F5', name: { en: 'Frosted', ar: 'مثلج', ckb: 'تەماوی' } },
];

export const CITIES: Localized[] = [
  { en: 'Erbil', ar: 'أربيل', ckb: 'هەولێر' },
  { en: 'Sulaymaniyah', ar: 'السليمانية', ckb: 'سلێمانی' },
  { en: 'Duhok', ar: 'دهوك', ckb: 'دهۆک' },
  { en: 'Halabja', ar: 'حلبجة', ckb: 'هەڵەبجە' },
  { en: 'Kirkuk', ar: 'كركوك', ckb: 'کەرکووک' },
  { en: 'Baghdad', ar: 'بغداد', ckb: 'بەغدا' },
  { en: 'Basra', ar: 'البصرة', ckb: 'بەسرە' },
  { en: 'Mosul', ar: 'الموصل', ckb: 'مووسڵ' },
  { en: 'Najaf', ar: 'النجف', ckb: 'نەجەف' },
  { en: 'Karbala', ar: 'كربلاء', ckb: 'کەربەلا' },
  { en: 'Hillah', ar: 'الحلة', ckb: 'حیللە' },
  { en: 'Ramadi', ar: 'الرمادي', ckb: 'ڕومادی' },
];

export type Vendor = {
  id: string;
  name: string;
  city: string;
  /** Phone for calls (07xx…) */
  phone: string;
  /** WhatsApp number if different from phone */
  whatsapp?: string;
  email?: string;
  about?: string;
  verified?: boolean;
};

/** A customer reaching out to a vendor through PrintingIQ. Vendors see these in their dashboard. */
export type LeadChannel = 'whatsapp' | 'call' | 'quote';
export type Lead = {
  id: string;
  vendorId: string;
  channel: LeadChannel;
  customerName: string;
  customerPhone: string;
  message?: string;
  items: { productId: string; name: string; sku?: string; qty?: number }[];
  createdAt: string;
  read: boolean;
};

export type Product = {
  id: string;
  vendorId: string;
  categoryId: string;
  name: Localized;
  description: Localized;
  price: number | null; // null = ask for price
  currency: Currency;
  unit: Unit;
  minOrder?: number;
  colors: ColorOption[];
  thickness: string[];
  sizes: string[];
  brand?: string;
  origin?: string;
  /** Vendor's own product code, shown on cards like "CODE: AC-3" */
  sku?: string;
  /** Units on hand; leave empty if the vendor doesn't track it */
  stockQty?: number;
  availability: Availability;
  images: string[];
  createdAt: string;
};

const empty: Localized = { en: '', ar: '', ckb: '' };
const pick = (...names: string[]) => COLOR_PALETTE.filter((c) => names.includes(c.name.en));

export const SEED_VENDORS: Vendor[] = [
  { id: 'v1', name: 'Hawler Sign Supply', city: 'Erbil', phone: '07501234567', whatsapp: '07501234567', about: 'Acrylic, ACP, LED and vinyl wholesaler since 2012.', verified: true },
  { id: 'v2', name: 'Al-Rafidain Print Materials', city: 'Baghdad', phone: '07701234567', verified: true },
  { id: 'v3', name: 'Slemani Stationery House', city: 'Sulaymaniyah', phone: '07711234567' },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'p1', sku: 'AC-122', stockQty: 340, vendorId: 'v1', categoryId: 'acrylic',
    name: { en: 'Cast acrylic sheet 122×244', ar: 'لوح أكريليك مصبوب 122×244', ckb: 'پارچەی ئەکریلیکی ڕێژراو 122×244' },
    description: {
      en: 'High-gloss cast acrylic for signs, light boxes and laser cutting. Protective film on both sides.',
      ar: 'أكريليك مصبوب عالي اللمعان للوحات والصناديق الضوئية والقص بالليزر. مع غلاف حماية من الجهتين.',
      ckb: 'ئەکریلیکی ڕێژراوی بریقەدار بۆ تابلۆ، لایت بۆکس و بڕینی لەیزەر. بە نایلۆنی پاراستن لە هەردوو ڕوو.',
    },
    price: 38000, currency: 'IQD', unit: 'sheet', minOrder: 5,
    colors: pick('Clear', 'White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Frosted'),
    thickness: ['2mm', '3mm', '5mm', '8mm', '10mm'], sizes: ['122×244 cm', '122×183 cm'],
    brand: 'Chi Mei', origin: 'Taiwan', availability: 'in_stock', images: [], createdAt: '2026-11-10',
  },
  {
    id: 'p2', sku: 'FX-5', stockQty: 820, vendorId: 'v2', categoryId: 'foam',
    name: { en: 'PVC foam board (Forex)', ar: 'فوم بورد PVC (فوركس)', ckb: 'فۆم بۆردی PVC (فۆرێکس)' },
    description: {
      en: 'Lightweight rigid PVC foam for indoor signs, exhibition stands and UV printing.',
      ar: 'فوم PVC خفيف وصلب للوحات الداخلية وأجنحة المعارض والطباعة UV.',
      ckb: 'فۆمی PVC سووک و ڕەق بۆ تابلۆی ناوەوە، پێشانگا و چاپی UV.',
    },
    price: 14000, currency: 'IQD', unit: 'sheet', minOrder: 10,
    colors: pick('White', 'Black'), thickness: ['3mm', '5mm', '10mm', '15mm'], sizes: ['122×244 cm'],
    origin: 'China', availability: 'in_stock', images: [], createdAt: '2026-11-12',
  },
  {
    id: 'p3', sku: 'ACP-3', stockQty: 150, vendorId: 'v1', categoryId: 'acp',
    name: { en: 'Aluminium composite panel (Alucobond)', ar: 'ألواح ألكوبوند', ckb: 'پارچەی ئەلەکوبۆند' },
    description: {
      en: 'PVDF-coated ACP for shop fronts and building cladding. 0.3mm aluminium skin.',
      ar: 'ألكوبوند بطلاء PVDF لواجهات المحلات وتغليف المباني. سماكة الألمنيوم 0.3 ملم.',
      ckb: 'ئەلەکوبۆندی بۆیەکراو بە PVDF بۆ ڕووکاری دوکان و بینا. ئەستووری ئەلەمنیۆم 0.3 ملم.',
    },
    price: 42, currency: 'USD', unit: 'sheet', minOrder: 10,
    colors: pick('Silver', 'White', 'Black', 'Gold', 'Red', 'Blue'), thickness: ['3mm', '4mm'], sizes: ['122×244 cm', '150×400 cm'],
    brand: 'Alucoil', origin: 'Turkey', availability: 'in_stock', images: [], createdAt: '2026-11-14',
  },
  {
    id: 'p4', sku: 'FL-440', vendorId: 'v2', categoryId: 'flex',
    name: { en: 'Frontlit flex banner 440g', ar: 'فليكس أمامي 440 غرام', ckb: 'فلێکسی فرۆنتلایت 440 گرام' },
    description: {
      en: 'Glossy frontlit flex for solvent and eco-solvent printers. Widths up to 5m.',
      ar: 'فليكس لامع للطابعات السولفنت والإيكو سولفنت. عرض حتى 5 متر.',
      ckb: 'فلێکسی بریقەدار بۆ چاپکەری سۆڵڤێنت و ئیکۆ سۆڵڤێنت. پانی تا 5 مەتر.',
    },
    price: 1750, currency: 'IQD', unit: 'm2', minOrder: 50,
    colors: pick('White'), thickness: ['440g', '510g'], sizes: ['1.6m', '2.2m', '3.2m', '5m'],
    origin: 'China', availability: 'in_stock', images: [], createdAt: '2026-11-15',
  },
  {
    id: 'p5', sku: 'VN-61', stockQty: 96, vendorId: 'v1', categoryId: 'vinyl',
    name: { en: 'Cutting vinyl (sticker) roll', ar: 'رول ستيكر قص', ckb: 'ڕۆڵی ستیکەری بڕین' },
    description: {
      en: 'Matte & gloss cutting vinyl for plotters. 61cm × 50m rolls.',
      ar: 'ستيكر قص مطفي ولامع للبلوتر. رول 61 سم × 50 م.',
      ckb: 'ستیکەری بڕینی مات و بریقەدار بۆ پلۆتەر. ڕۆڵی 61 سم × 50 م.',
    },
    price: 65000, currency: 'IQD', unit: 'roll',
    colors: pick('White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Silver', 'Gold'),
    thickness: [], sizes: ['61cm × 50m', '122cm × 50m'], brand: 'Oracal', origin: 'Germany', availability: 'in_stock', images: [], createdAt: '2026-11-16',
  },
  {
    id: 'p6', sku: 'ECO-1802', vendorId: 'v2', categoryId: 'large-format',
    name: { en: 'Eco-solvent printer 1.8m', ar: 'طابعة إيكو سولفنت 1.8 م', ckb: 'چاپکەری ئیکۆ سۆڵڤێنت 1.8 م' },
    description: {
      en: 'Dual i3200 heads, up to 45 m²/h. Includes installation and training in Baghdad & Erbil.',
      ar: 'رأسين i3200، حتى 45 م²/ساعة. يشمل التنصيب والتدريب في بغداد وأربيل.',
      ckb: 'دوو سەری i3200، تا 45 م²/کاتژمێر. دامەزراندن و ڕاهێنان لە بەغدا و هەولێر لەخۆدەگرێت.',
    },
    price: null, currency: 'USD', unit: 'piece', colors: [], thickness: [], sizes: ['1.8m', '3.2m'],
    origin: 'China', availability: 'custom_order', images: [], createdAt: '2026-11-17',
  },
  {
    id: 'p7', sku: 'A4-80', stockQty: 410, vendorId: 'v3', categoryId: 'office-paper',
    name: { en: 'A4 copy paper 80g', ar: 'ورق استنساخ A4 80 غرام', ckb: 'کاغەزی کۆپی A4 80 گرام' },
    description: {
      en: '5 reams (2500 sheets) per box. Bright white, jam-free for laser and inkjet.',
      ar: '5 رزم (2500 ورقة) في الكرتون. أبيض ناصع، مناسب لليزر والحبر.',
      ckb: '5 بەستە (2500 پەڕە) لە هەر کارتۆنێک. سپی ڕوون، گونجاو بۆ لەیزەر و حیبر.',
    },
    price: 32000, currency: 'IQD', unit: 'box', minOrder: 1,
    colors: [], thickness: ['70g', '80g'], sizes: ['A4', 'A3'], brand: 'Double A', origin: 'Thailand', availability: 'in_stock', images: [], createdAt: '2026-11-17',
  },
  {
    id: 'p8', sku: 'LED-PS300', stockQty: 146, vendorId: 'v1', categoryId: 'led',
    name: { en: 'LED power supply 300W 12V', ar: 'محولة ليد 300 واط 12 فولت', ckb: 'پاوەر سەپڵای LED 300 وات 12 ڤۆڵت' },
    description: {
      en: 'For channel letters and light boxes. Aluminium case, short-circuit protection.',
      ar: 'للحروف البارزة والصناديق الضوئية. هيكل ألمنيوم مع حماية من الشورت.',
      ckb: 'بۆ پیتی بەرجەستە و لایت بۆکس. قاپی ئەلەمنیۆم، پاراستن لە شۆرت.',
    },
    price: 6.5, currency: 'USD', unit: 'piece', minOrder: 1, colors: [], thickness: [], sizes: ['100W', '200W', '300W', '400W'],
    origin: 'China', availability: 'in_stock', images: [], createdAt: '2026-11-17',
  },
  {
    id: 'p9', sku: 'MU-11', stockQty: 400, vendorId: 'v3', categoryId: 'mugs',
    name: { en: 'Sublimation mug 11oz', ar: 'كوب سبلميشن 11 أونصة', ckb: 'کوپی سەبلیمەیشن 11 ئۆنس' },
    description: {
      en: 'White coated ceramic mug for logo printing. Inner color options. Packed 36 per carton.',
      ar: 'كوب سيراميك أبيض مطلي لطباعة الشعارات. ألوان داخلية متعددة. 36 قطعة في الكرتون.',
      ckb: 'کوپی سیرامیکی سپی بۆ چاپی لۆگۆ. ڕەنگی ناوەوەی جیاواز. 36 دانە لە هەر کارتۆنێک.',
    },
    price: 1.8, currency: 'USD', unit: 'piece', minOrder: 36, colors: pick('White', 'Black', 'Red', 'Blue', 'Yellow', 'Pink'),
    thickness: [], sizes: ['11oz', '15oz'], origin: 'China', availability: 'in_stock', images: [], createdAt: '2026-11-18',
  },
  {
    id: 'p10', sku: 'NB-A5', stockQty: 135, vendorId: 'v3', categoryId: 'notebooks',
    name: { en: 'A5 leather notebook with logo', ar: 'دفتر جلد A5 مع شعار', ckb: 'دەفتەری چەرمی A5 لەگەڵ لۆگۆ' },
    description: {
      en: 'PU leather cover, 160 lined pages, elastic band. Logo engraving or printing available.',
      ar: 'غلاف جلد PU، 160 صفحة مسطرة، مع شريط مطاطي. يمكن حفر أو طباعة الشعار.',
      ckb: 'بەرگی چەرمی PU، 160 لاپەڕەی هێڵدار، لاستیکی داخستن. هەڵکەندن یان چاپی لۆگۆ بەردەستە.',
    },
    price: 3, currency: 'USD', unit: 'piece', minOrder: 20, colors: pick('Black', 'Blue', 'Red', 'Brown', 'Green'),
    thickness: [], sizes: ['A5', 'A4'], availability: 'in_stock', images: [], createdAt: '2026-11-18',
  },
  {
    id: 'p11', sku: 'CR-22', vendorId: 'v2', categoryId: 'crystal',
    name: { en: 'Crystal award with UV print', ar: 'درع كريستال مع طباعة UV', ckb: 'خەڵاتی کریستاڵ بە چاپی UV' },
    description: {
      en: 'K9 crystal on black base, full-color UV print or laser engraving. Ready in 3 days.',
      ar: 'كريستال K9 بقاعدة سوداء، طباعة UV ملونة أو حفر ليزر. جاهز خلال 3 أيام.',
      ckb: 'کریستاڵی K9 لەسەر بنکەی ڕەش، چاپی UV ڕەنگاوڕەنگ یان هەڵکەندنی لەیزەر. لە 3 ڕۆژدا ئامادە دەبێت.',
    },
    price: 18000, currency: 'IQD', unit: 'piece', minOrder: 5, colors: [], thickness: [], sizes: ['18 cm', '22 cm', '26 cm'],
    availability: 'custom_order', images: [], createdAt: '2026-11-18',
  },
  {
    id: 'p12', sku: 'BC-1000', vendorId: 'v1', categoryId: 'business-cards',
    name: { en: 'Business cards – 1000 pcs', ar: 'كروت شخصية – 1000 قطعة', ckb: 'کارتی بازرگانی – 1000 دانە' },
    description: {
      en: '350g coated card, double-sided color, matte or gloss lamination. Delivery to all Kurdistan cities.',
      ar: 'كارت 350 غرام مطلي، طباعة ملونة على الوجهين، سلفنة مطفية أو لامعة. توصيل لكل مدن كردستان.',
      ckb: 'کارتی 350 گرام، چاپی ڕەنگاوڕەنگ لە هەردوو ڕوو، لامینەیشنی مات یان بریقەدار. گەیاندن بۆ هەموو شارەکانی کوردستان.',
    },
    price: 25000, currency: 'IQD', unit: 'box', colors: [], thickness: ['350g'], sizes: ['9×5 cm'],
    availability: 'in_stock', images: [], createdAt: '2026-11-18',
  },
  {
    id: 'p13', sku: 'VS-01', stockQty: 0, vendorId: 'v2', categoryId: 'vests',
    name: { en: 'Reflective safety vest with logo', ar: 'سترة عاكسة مع شعار', ckb: 'هێلەگی ڕووناکیدەر لەگەڵ لۆگۆ' },
    description: {
      en: 'High-visibility vest with pockets. Logo print on the back.',
      ar: 'سترة عالية الوضوح مع جيوب. طباعة الشعار على الظهر.',
      ckb: 'هێلەگی بەرچاو لەگەڵ گیرفان. چاپی لۆگۆ لە پشتەوە.',
    },
    price: 12, currency: 'USD', unit: 'piece', minOrder: 10, colors: pick('Yellow', 'Orange'), thickness: [], sizes: ['M', 'L', 'XL', 'XXL'],
    availability: 'out_of_stock', images: [], createdAt: '2026-11-18',
  },
];

export function emptyProduct(vendorId: string): Product {
  return {
    id: '', vendorId, categoryId: '', name: { ...empty }, description: { ...empty },
    price: null, currency: 'IQD', unit: 'sheet', colors: [], thickness: [], sizes: [],
    availability: 'in_stock', images: [], createdAt: new Date().toISOString(),
  };
}
