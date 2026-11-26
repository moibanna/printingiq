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
  /** Vendor's own website or social page */
  website?: string;
  /** Listing copied daily from the vendor's public website / social posts (scripts/sync), not managed by the vendor here */
  imported?: boolean;
  /** When that copy was last refreshed (ISO date) */
  syncedAt?: string;
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
  /** Original listing (shop page or social post) for imported products */
  sourceUrl?: string;
  /** Standard item this product is (src/lib/standards.ts), so customers can compare its price across vendors */
  templateId?: string;
};

const empty: Localized = { en: '', ar: '', ckb: '' };

/** Products in the daily catalog file may leave optional fields out to keep it small. */
export type ImportedProduct = Partial<Product> & Pick<Product, 'id' | 'vendorId' | 'categoryId' | 'name'>;
/** Daily USD → IQD rate written by the sync (scripts/sync/exchange.py). */
export type Exchange = { iqdPerUsd: number; date?: string; source?: string; sourceUrl?: string; manual?: boolean; market?: boolean };
/** Used until the daily catalog has loaded (close to the Baghdad market rate in late 2026). */
export const DEFAULT_EXCHANGE: Exchange = { iqdPerUsd: 1690 };

export type ImportedCatalog = { syncedAt?: string; exchange?: Exchange | null; vendors: Vendor[]; products: ImportedProduct[] };

/** Fills in the fields the daily catalog leaves out, so the rest of the app can rely on them. */
export function fromImported(data: ImportedCatalog): { vendors: Vendor[]; products: Product[] } {
  return {
    vendors: data.vendors ?? [],
    products: (data.products ?? []).map((x) => ({
      description: { ...empty }, price: null, currency: 'USD', unit: 'piece', colors: [], thickness: [], sizes: [],
      availability: 'in_stock', images: [], createdAt: '2026-11-01T00:00:00Z',
      ...x,
    })),
  };
}

export function emptyProduct(vendorId: string): Product {
  return {
    id: '', vendorId, categoryId: '', name: { ...empty }, description: { ...empty },
    price: null, currency: 'IQD', unit: 'sheet', colors: [], thickness: [], sizes: [],
    availability: 'in_stock', images: [], createdAt: new Date().toISOString(),
  };
}

/** A customer describing a job ("500 business cards, two sides") so vendors can send offers. No account needed:
 *  the customer keeps a private link (id + token) to see the offers. */
export type Attachment = { url: string; name: string; type?: string };
export type QuoteRequest = {
  id: string;
  /** Secret that lets the customer (and only them) read the offers */
  token?: string;
  groupId: string;
  categoryId?: string;
  description: string;
  quantity?: string;
  city: string;
  files: Attachment[];
  customerName: string;
  customerPhone: string;
  status: 'open' | 'closed';
  createdAt: string;
};
export type Offer = {
  id: string;
  requestId: string;
  vendorId: string;
  price: number | null;
  currency: Currency;
  note?: string;
  /** Days until ready, if the vendor says */
  days?: number;
  createdAt: string;
};
