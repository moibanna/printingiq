import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

/** ckb = Central Kurdish (Sorani, Arabic script). */
export type Lang = 'ckb' | 'ar' | 'en';
export const LANGS: Lang[] = ['ckb', 'ar', 'en'];
export const LANG_LABEL: Record<Lang, string> = { ckb: 'کوردی', ar: 'العربية', en: 'English' };
export const isRTL = (l: Lang) => l !== 'en';

/** Text stored in all three languages (products, categories, etc.). */
export type Localized = Record<Lang, string>;

const strings = {
  appName: { en: 'PrintingIQ', ar: 'PrintingIQ', ckb: 'PrintingIQ' },
  tagline: {
    en: 'Print, sign & stationery supplies across Iraq',
    ar: 'مستلزمات الطباعة والدعاية والقرطاسية في كل العراق',
    ckb: 'کەرەستەی چاپ، ڕیکلام و قرتاسیە لە هەموو عێراق',
  },
  home: { en: 'Home', ar: 'الرئيسية', ckb: 'سەرەکی' },
  categories: { en: 'Categories', ar: 'الأقسام', ckb: 'بەشەکان' },
  sell: { en: 'Sell', ar: 'بيع', ckb: 'فرۆشتن' },
  account: { en: 'Account', ar: 'الحساب', ckb: 'هەژمار' },
  search: { en: 'Search acrylic, flex, printers…', ar: 'ابحث عن أكريليك، فليكس، طابعات…', ckb: 'بگەڕێ بۆ ئەکریلیک، فلێکس، چاپکەر…' },
  latest: { en: 'Latest products', ar: 'أحدث المنتجات', ckb: 'نوێترین بەرهەمەکان' },
  seeAll: { en: 'See all', ar: 'عرض الكل', ckb: 'هەمووی' },
  noProducts: { en: 'No products yet.', ar: 'لا توجد منتجات بعد.', ckb: 'هێشتا هیچ بەرهەمێک نییە.' },
  colors: { en: 'Colors', ar: 'الألوان', ckb: 'ڕەنگەکان' },
  thickness: { en: 'Thickness', ar: 'السماكة', ckb: 'ئەستووری' },
  sizes: { en: 'Sizes', ar: 'المقاسات', ckb: 'قەبارەکان' },
  brand: { en: 'Brand', ar: 'الماركة', ckb: 'براند' },
  origin: { en: 'Origin', ar: 'بلد المنشأ', ckb: 'وڵاتی دروستکردن' },
  minOrder: { en: 'Minimum order', ar: 'أقل كمية للطلب', ckb: 'کەمترین داواکاری' },
  stock: { en: 'Availability', ar: 'التوفر', ckb: 'بەردەستبوون' },
  inStock: { en: 'In stock', ar: 'متوفر', ckb: 'بەردەستە' },
  onOrder: { en: 'On order', ar: 'حسب الطلب', ckb: 'بە داواکاری' },
  description: { en: 'Description', ar: 'الوصف', ckb: 'وەسف' },
  vendor: { en: 'Vendor', ar: 'البائع', ckb: 'فرۆشیار' },
  verified: { en: 'Verified', ar: 'موثّق', ckb: 'پشتڕاستکراوە' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب', ckb: 'واتسئەپ' },
  call: { en: 'Call', ar: 'اتصال', ckb: 'پەیوەندی' },
  askPrice: { en: 'Ask for price', ar: 'اسأل عن السعر', ckb: 'پرسیاری نرخ بکە' },
  per: { en: 'per', ar: 'لكل', ckb: 'بۆ هەر' },
  // Units
  unit_sheet: { en: 'sheet', ar: 'لوح', ckb: 'پارچە' },
  unit_m2: { en: 'm²', ar: 'م²', ckb: 'م²' },
  unit_roll: { en: 'roll', ar: 'رول', ckb: 'ڕۆڵ' },
  unit_piece: { en: 'piece', ar: 'قطعة', ckb: 'دانە' },
  unit_box: { en: 'box', ar: 'كرتون', ckb: 'کارتۆن' },
  unit_pack: { en: 'pack', ar: 'باكيت', ckb: 'پاکەت' },
  unit_kg: { en: 'kg', ar: 'كغم', ckb: 'کگم' },
  unit_liter: { en: 'liter', ar: 'لتر', ckb: 'لیتر' },
  // Sell form
  addProduct: { en: 'Add a product', ar: 'أضف منتجاً', ckb: 'بەرهەمێک زیاد بکە' },
  sellIntro: {
    en: 'Write the name and description in all three languages so every customer can find it.',
    ar: 'اكتب الاسم والوصف باللغات الثلاث ليجده كل الزبائن.',
    ckb: 'ناو و وەسف بە هەر سێ زمانەکە بنووسە بۆ ئەوەی هەموو کڕیارێک بیدۆزێتەوە.',
  },
  productName: { en: 'Product name', ar: 'اسم المنتج', ckb: 'ناوی بەرهەم' },
  category: { en: 'Category', ar: 'القسم', ckb: 'بەش' },
  price: { en: 'Price', ar: 'السعر', ckb: 'نرخ' },
  currency: { en: 'Currency', ar: 'العملة', ckb: 'دراو' },
  unit: { en: 'Unit', ar: 'الوحدة', ckb: 'یەکە' },
  addColor: { en: 'Add color', ar: 'أضف لوناً', ckb: 'ڕەنگ زیاد بکە' },
  commaHint: { en: 'Separate with commas, e.g. 2mm, 3mm, 5mm', ar: 'افصل بفاصلة، مثلاً 2mm, 3mm, 5mm', ckb: 'بە فاریزە جیایان بکەوە، بۆ نموونە 2mm, 3mm, 5mm' },
  photos: { en: 'Photos', ar: 'الصور', ckb: 'وێنەکان' },
  addPhoto: { en: 'Add photo', ar: 'أضف صورة', ckb: 'وێنە زیاد بکە' },
  publish: { en: 'Publish product', ar: 'نشر المنتج', ckb: 'بڵاوکردنەوەی بەرهەم' },
  published: { en: 'Product published!', ar: 'تم نشر المنتج!', ckb: 'بەرهەمەکە بڵاوکرایەوە!' },
  required: { en: 'Please fill the name (at least one language), category and your shop profile.', ar: 'يرجى إدخال الاسم (بلغة واحدة على الأقل) والقسم وملف متجرك.', ckb: 'تکایە ناو (بەلایەنی کەمەوە بە یەک زمان)، بەش و پرۆفایلی دوکانەکەت پڕ بکەرەوە.' },
  needProfile: { en: 'Set up your shop profile in Account first.', ar: 'أنشئ ملف متجرك في الحساب أولاً.', ckb: 'سەرەتا پرۆفایلی دوکانەکەت لە هەژمار دروست بکە.' },
  // Account
  language: { en: 'Language', ar: 'اللغة', ckb: 'زمان' },
  shopProfile: { en: 'Shop profile (vendors)', ar: 'ملف المتجر (للبائعين)', ckb: 'پرۆفایلی دوکان (بۆ فرۆشیاران)' },
  shopName: { en: 'Shop name', ar: 'اسم المتجر', ckb: 'ناوی دوکان' },
  city: { en: 'City', ar: 'المدينة', ckb: 'شار' },
  phone: { en: 'Phone / WhatsApp (07xx…)', ar: 'الهاتف / واتساب (07xx…)', ckb: 'تەلەفۆن / واتسئەپ (07xx…)' },
  save: { en: 'Save', ar: 'حفظ', ckb: 'پاشەکەوت' },
  saved: { en: 'Saved', ar: 'تم الحفظ', ckb: 'پاشەکەوت کرا' },
  myProducts: { en: 'My products', ar: 'منتجاتي', ckb: 'بەرهەمەکانم' },
  delete: { en: 'Delete', ar: 'حذف', ckb: 'سڕینەوە' },
  email: { en: 'Email', ar: 'البريد الإلكتروني', ckb: 'ئیمەیڵ' },
  password: { en: 'Password', ar: 'كلمة المرور', ckb: 'وشەی نهێنی' },
  signIn: { en: 'Sign in', ar: 'تسجيل الدخول', ckb: 'چوونەژوورەوە' },
  signUp: { en: 'Create account', ar: 'إنشاء حساب', ckb: 'دروستکردنی هەژمار' },
  signOut: { en: 'Sign out', ar: 'تسجيل الخروج', ckb: 'چوونەدەرەوە' },
  demoMode: {
    en: 'Demo mode: data is saved on this device only. Connect Supabase to go live.',
    ar: 'وضع تجريبي: البيانات محفوظة على هذا الجهاز فقط. اربط Supabase للتشغيل الفعلي.',
    ckb: 'دۆخی تاقیکردنەوە: زانیارییەکان تەنها لەسەر ئەم ئامێرە پاشەکەوت دەکرێن. Supabase ببەستەوە بۆ کارپێکردنی ڕاستەقینە.',
  },
  results: { en: 'results', ar: 'نتيجة', ckb: 'ئەنجام' },
  products: { en: 'Products', ar: 'المنتجات', ckb: 'بەرهەمەکان' },
  allProducts: { en: 'All products', ar: 'كل المنتجات', ckb: 'هەموو بەرهەمەکان' },
  all: { en: 'All', ar: 'الكل', ckb: 'هەموو' },
  favorites: { en: 'Favorites', ar: 'المفضلة', ckb: 'دڵخوازەکان' },
  quoteList: { en: 'Quote list', ar: 'قائمة الطلب', ckb: 'لیستی داواکاری' },
  addToQuote: { en: 'Add to quote list', ar: 'أضف إلى قائمة الطلب', ckb: 'زیادکردن بۆ لیستی داواکاری' },
  added: { en: 'Added ✓', ar: 'تمت الإضافة ✓', ckb: 'زیاد کرا ✓' },
  code: { en: 'CODE', ar: 'الكود', ckb: 'کۆد' },
  qty: { en: 'Qty', ar: 'الكمية', ckb: 'بڕ' },
  available: { en: 'available', ar: 'متوفر', ckb: 'بەردەستە' },
  outOfStock: { en: 'Out of stock', ar: 'نفد المخزون', ckb: 'نەماوە' },
  customOrder: { en: 'Custom order', ar: 'حسب الطلب', ckb: 'بە داواکاری' },
  sortBy: { en: 'Sort by', ar: 'ترتيب حسب', ckb: 'ڕیزکردن بەپێی' },
  sortNewest: { en: 'Newest', ar: 'الأحدث', ckb: 'نوێترین' },
  sortPriceLow: { en: 'Price: low to high', ar: 'السعر: من الأقل', ckb: 'نرخ: نزم بۆ بەرز' },
  sortPriceHigh: { en: 'Price: high to low', ar: 'السعر: من الأعلى', ckb: 'نرخ: بەرز بۆ نزم' },
  sortStock: { en: 'Most in stock', ar: 'الأكثر توفراً', ckb: 'زۆرترین بڕ' },
  hero1Title: { en: 'Every sign material in one place', ar: 'كل مواد الدعاية في مكان واحد', ckb: 'هەموو کەرەستەی ڕیکلام لە یەک شوێن' },
  hero1Sub: { en: 'Acrylic, foam, Alucobond, flex and vinyl from vendors across Iraq', ar: 'أكريليك، فوم، ألكوبوند، فليكس وستيكر من بائعين في كل العراق', ckb: 'ئەکریلیک، فۆم، ئەلەکوبۆند، فلێکس و ستیکەر لە فرۆشیارانی هەموو عێراق' },
  hero2Title: { en: 'Printers, lasers & CNC', ar: 'طابعات، ليزر و CNC', ckb: 'چاپکەر، لەیزەر و CNC' },
  hero2Sub: { en: 'Compare machines and ask vendors directly on WhatsApp', ar: 'قارن المكائن واسأل البائعين مباشرة على واتساب', ckb: 'ئامێرەکان بەراورد بکە و ڕاستەوخۆ لە واتسئەپ پرسیار بکە' },
  hero3Title: { en: 'Gifts, stationery & awards', ar: 'هدايا، قرطاسية ودروع', ckb: 'دیاری، قرتاسیە و خەڵات' },
  hero3Sub: { en: 'Branded mugs, notebooks, pens, crystal awards and VIP sets', ar: 'أكواب ودفاتر وأقلام ودروع كريستال وأطقم VIP بشعارك', ckb: 'کوپ، دەفتەر، قەڵەم، خەڵاتی کریستاڵ و سێتی VIP بە لۆگۆی خۆت' },
  shopNow: { en: 'Browse', ar: 'تصفح', ckb: 'سەیر بکە' },
  vendorCtaTitle: { en: 'Do you sell print or stationery supplies?', ar: 'هل تبيع مستلزمات طباعة أو قرطاسية؟', ckb: 'کەرەستەی چاپ یان قرتاسیە دەفرۆشیت؟' },
  vendorCtaBody: { en: 'List your products for free and reach customers in every city.', ar: 'اعرض منتجاتك مجاناً وتواصل مع زبائن في كل المدن.', ckb: 'بەرهەمەکانت بەخۆڕایی دابنێ و بگە بە کڕیارانی هەموو شارەکان.' },
  vendorCtaButton: { en: 'Start selling', ar: 'ابدأ البيع', ckb: 'دەست بە فرۆشتن بکە' },
  footerAbout: { en: 'The marketplace for print, sign, stationery and promotional supplies in Iraq.', ar: 'سوق مستلزمات الطباعة والدعاية والقرطاسية والهدايا في العراق.', ckb: 'بازاڕی کەرەستەی چاپ، ڕیکلام، قرتاسیە و دیاری لە عێراق.' },
  quickLinks: { en: 'Quick links', ar: 'روابط سريعة', ckb: 'بەستەرە خێراکان' },
  emptyQuote: { en: 'Your quote list is empty. Add products, then send the list to each vendor on WhatsApp.', ar: 'قائمة الطلب فارغة. أضف منتجات ثم أرسل القائمة لكل بائع على واتساب.', ckb: 'لیستی داواکاریت بەتاڵە. بەرهەم زیاد بکە، پاشان لیستەکە بە واتسئەپ بۆ هەر فرۆشیارێک بنێرە.' },
  emptyFavorites: { en: 'No favorites yet. Tap ♡ on a product to save it.', ar: 'لا توجد مفضلة بعد. اضغط ♡ على أي منتج لحفظه.', ckb: 'هێشتا هیچ دڵخوازێک نییە. ♡ لەسەر بەرهەمێک دابگرە بۆ پاشەکەوتکردن.' },
  sendWhatsApp: { en: 'Send request on WhatsApp', ar: 'أرسل الطلب على واتساب', ckb: 'ناردنی داواکاری بە واتسئەپ' },
  quoteHello: { en: 'Hello, I would like a price quote from PrintingIQ for:', ar: 'مرحباً، أريد عرض سعر من PrintingIQ لـ:', ckb: 'سڵاو، داوای نرخم هەیە لە ڕێگەی PrintingIQ بۆ:' },
  estTotal: { en: 'Estimated total', ar: 'المجموع التقريبي', ckb: 'کۆی گشتی نزیکەیی' },
  subcategory: { en: 'Subcategory', ar: 'القسم الفرعي', ckb: 'بەشی لاوەکی' },
  sku: { en: 'Product code (optional)', ar: 'كود المنتج (اختياري)', ckb: 'کۆدی بەرهەم (ئارەزوومەندانە)' },
  stockQty: { en: 'Quantity in stock (optional)', ar: 'الكمية المتوفرة (اختياري)', ckb: 'بڕی بەردەست (ئارەزوومەندانە)' },
} satisfies Record<string, Localized>;

export type StringKey = keyof typeof strings;

type Ctx = {
  lang: Lang;
  rtl: boolean;
  setLang: (l: Lang) => void;
  t: (k: StringKey) => string;
  /** Forward arrow for the current direction (never mirrored by the text engine). */
  arrow: string;
  /** Pick the best text from a Localized value, falling back to other languages. */
  tl: (v: Partial<Localized> | undefined | null) => string;
};

const I18nContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'printingiq.lang';

function detect(): Lang {
  const code = getLocales()[0]?.languageCode ?? 'en';
  if (code === 'ku' || code === 'ckb') return 'ckb';
  if (code === 'ar') return 'ar';
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => v && LANGS.includes(v as Lang) && setLangState(v as Lang))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'ckb' ? 'ckb' : lang;
      document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
      document.title = 'PrintingIQ';
      // Noto Sans Arabic covers Kurdish Sorani letters (ڕ ڵ ۆ ێ ڤ) as well as Arabic.
      if (!document.getElementById('piq-font')) {
        const link = document.createElement('link');
        link.id = 'piq-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;800&display=swap';
        document.head.appendChild(link);
        const style = document.createElement('style');
        style.textContent = 'body,input,textarea,button,div{font-family:"Noto Sans Arabic",system-ui,sans-serif}';
        document.head.appendChild(style);
      }
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const order: Lang[] = [lang, ...LANGS.filter((l) => l !== lang)];
    return {
      lang,
      rtl: isRTL(lang),
      arrow: isRTL(lang) ? '←' : '→',
      setLang,
      t: (k) => strings[k][lang],
      tl: (v) => {
        if (!v) return '';
        for (const l of order) if (v[l]?.trim()) return v[l]!;
        return '';
      },
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
