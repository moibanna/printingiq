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
  // Vendor accounts
  vendorAccount: { en: 'Vendor account', ar: 'حساب البائع', ckb: 'هەژماری فرۆشیار' },
  customersNoAccount: { en: 'Customers don’t need an account: just browse and contact vendors.', ar: 'الزبائن لا يحتاجون حساباً: تصفح وتواصل مع البائعين مباشرة.', ckb: 'کڕیاران پێویستیان بە هەژمار نییە: تەنها سەیر بکە و پەیوەندی بە فرۆشیارەوە بکە.' },
  createVendor: { en: 'Create a vendor account', ar: 'إنشاء حساب بائع', ckb: 'دروستکردنی هەژماری فرۆشیار' },
  haveAccount: { en: 'Already a vendor? Sign in', ar: 'لديك حساب؟ سجّل الدخول', ckb: 'هەژمارت هەیە؟ بچۆ ژوورەوە' },
  noAccount: { en: 'New vendor? Create an account', ar: 'بائع جديد؟ أنشئ حساباً', ckb: 'فرۆشیاری نوێیت؟ هەژمار دروست بکە' },
  whatsappNumber: { en: 'WhatsApp number (if different)', ar: 'رقم الواتساب (إن كان مختلفاً)', ckb: 'ژمارەی واتسئەپ (ئەگەر جیاوازە)' },
  aboutShop: { en: 'About your shop (optional)', ar: 'نبذة عن متجرك (اختياري)', ckb: 'دەربارەی دوکانەکەت (ئارەزوومەندانە)' },
  passwordHint: { en: 'At least 6 characters', ar: '6 أحرف على الأقل', ckb: 'بەلایەنی کەم 6 پیت' },
  fillRequired: { en: 'Please fill shop name, phone, email and password.', ar: 'يرجى إدخال اسم المتجر والهاتف والبريد وكلمة المرور.', ckb: 'تکایە ناوی دوکان، تەلەفۆن، ئیمەیڵ و وشەی نهێنی بنووسە.' },
  checkEmail: { en: 'Account created. If asked, confirm your email, then sign in.', ar: 'تم إنشاء الحساب. إن طُلب منك، أكّد بريدك ثم سجّل الدخول.', ckb: 'هەژمار دروست کرا. ئەگەر داوا کرا، ئیمەیڵەکەت پشتڕاست بکەرەوە و بچۆ ژوورەوە.' },
  dashboard: { en: 'Vendor dashboard', ar: 'لوحة البائع', ckb: 'داشبۆردی فرۆشیار' },
  inquiries: { en: 'Inquiries', ar: 'الاستفسارات', ckb: 'داواکارییەکان' },
  myShop: { en: 'My shop', ar: 'متجري', ckb: 'دوکانەکەم' },
  viewShop: { en: 'View shop', ar: 'عرض المتجر', ckb: 'بینینی دوکان' },
  edit: { en: 'Edit', ar: 'تعديل', ckb: 'دەستکاری' },
  saveChanges: { en: 'Save changes', ar: 'حفظ التغييرات', ckb: 'پاشەکەوتکردنی گۆڕانکاری' },
  editProduct: { en: 'Edit product', ar: 'تعديل المنتج', ckb: 'دەستکاری بەرهەم' },
  noInquiries: { en: 'No inquiries yet. When a customer contacts you through PrintingIQ, it appears here and you get a notification.', ar: 'لا توجد استفسارات بعد. عندما يتواصل معك زبون عبر PrintingIQ ستظهر هنا وتصلك إشعار.', ckb: 'هێشتا هیچ داواکارییەک نییە. کاتێک کڕیارێک لە ڕێگەی PrintingIQ پەیوەندیت پێوە دەکات، لێرە دەردەکەوێت و ئاگادارکردنەوەت پێدەگات.' },
  newInquiry: { en: 'New customer inquiry', ar: 'استفسار جديد من زبون', ckb: 'داواکاری نوێی کڕیار' },
  wantsToContact: { en: 'wants to contact you about', ar: 'يريد التواصل معك بخصوص', ckb: 'دەیەوێت پەیوەندیت پێوە بکات دەربارەی' },
  viaWhatsapp: { en: 'via WhatsApp', ar: 'عبر واتساب', ckb: 'لە ڕێگەی واتسئەپ' },
  viaCall: { en: 'by phone call', ar: 'عبر اتصال', ckb: 'بە پەیوەندی تەلەفۆنی' },
  viaQuote: { en: 'quote request', ar: 'طلب عرض سعر', ckb: 'داوای نرخ' },
  markRead: { en: 'Mark as read', ar: 'تحديد كمقروء', ckb: 'وەک خوێندراو' },
  replyWhatsapp: { en: 'Reply on WhatsApp', ar: 'الرد على واتساب', ckb: 'وەڵام بە واتسئەپ' },
  enableAlerts: { en: 'Turn on notifications', ar: 'تفعيل الإشعارات', ckb: 'چالاککردنی ئاگادارکردنەوە' },
  signInToSell: { en: 'Sign in or create a vendor account to list products.', ar: 'سجّل الدخول أو أنشئ حساب بائع لعرض المنتجات.', ckb: 'بچۆ ژوورەوە یان هەژماری فرۆشیار دروست بکە بۆ دانانی بەرهەم.' },
  // Contact flow
  contactVendor: { en: 'Contact vendor', ar: 'تواصل مع البائع', ckb: 'پەیوەندی بە فرۆشیار' },
  yourName: { en: 'Your name', ar: 'اسمك', ckb: 'ناوت' },
  yourPhone: { en: 'Your phone (07xx…)', ar: 'رقم هاتفك (07xx…)', ckb: 'ژمارەی تەلەفۆنت (07xx…)' },
  yourMessage: { en: 'Message (optional)', ar: 'رسالة (اختياري)', ckb: 'نامە (ئارەزوومەندانە)' },
  contactNote: { en: 'The vendor is notified on PrintingIQ that you want to contact them.', ar: 'سيتم إشعار البائع على PrintingIQ بأنك تريد التواصل معه.', ckb: 'فرۆشیار لە PrintingIQ ئاگادار دەکرێتەوە کە دەتەوێت پەیوەندی پێوە بکەیت.' },
  needNamePhone: { en: 'Please enter your name and phone.', ar: 'يرجى إدخال اسمك ورقم هاتفك.', ckb: 'تکایە ناو و ژمارەی تەلەفۆنت بنووسە.' },
  waGreeting: { en: 'Hello {vendor}, I found your product on PrintingIQ:', ar: 'مرحباً {vendor}، وجدت منتجك على PrintingIQ:', ckb: 'سڵاو {vendor}، بەرهەمەکەتم لە PrintingIQ بینی:' },
  waMyName: { en: 'My name', ar: 'اسمي', ckb: 'ناوم' },
  replyGreeting: { en: 'Hello {name}, this is {shop}. Thank you for your inquiry on PrintingIQ.', ar: 'مرحباً {name}، معك {shop}. شكراً لاستفسارك عبر PrintingIQ.', ckb: 'سڵاو {name}، من {shop}م. سوپاس بۆ داواکارییەکەت لە PrintingIQ.' },
  noContact: { en: 'This vendor hasn’t added contact details yet.', ar: 'لم يضف هذا البائع معلومات التواصل بعد.', ckb: 'ئەم فرۆشیارە هێشتا زانیاری پەیوەندی زیاد نەکردووە.' },
  showMore: { en: 'Show more', ar: 'عرض المزيد', ckb: 'زیاتر نیشان بدە' },
  viewOriginal: { en: 'View original listing', ar: 'عرض الإعلان الأصلي', ckb: 'بینینی ڕیکلامی ڕەسەن' },
  vendorSite: { en: 'Vendor website', ar: 'موقع البائع', ckb: 'ماڵپەڕی فرۆشیار' },
  priceChecked: { en: 'Price checked {date}', ar: 'تم التحقق من السعر {date}', ckb: 'نرخ پشکنرا {date}' },
  importedNote: {
    en: 'Copied from the vendor’s public website or page and updated daily. Confirm the final price and stock with the vendor.',
    ar: 'منقول من موقع البائع أو صفحته العامة ويُحدَّث يومياً. تأكد من السعر النهائي والتوفر مع البائع.',
    ckb: 'لە ماڵپەڕ یان پەڕەی گشتی فرۆشیار وەرگیراوە و ڕۆژانە نوێ دەکرێتەوە. نرخی کۆتایی و بەردەستبوون لەگەڵ فرۆشیار پشتڕاست بکەرەوە.',
  },
  dollarRate: { en: 'Dollar market rate', ar: 'سعر الدولار في السوق', ckb: 'نرخی دۆلار لە بازاڕ' },
  rateNote: {
    en: 'Converted at the market rate {rate} ({date}). Prices are set by the vendor in {cur}; confirm with them.',
    ar: 'محوّل بسعر السوق {rate} ({date}). السعر يحدده البائع بـ {cur}؛ تأكد منه.',
    ckb: 'گۆڕدراوە بە نرخی بازاڕ {rate} ({date}). نرخ لەلایەن فرۆشیارەوە بە {cur} دانراوە؛ لەگەڵی پشتڕاست بکەرەوە.',
  },
  rateManual: { en: 'set by PrintingIQ', ar: 'محدد من PrintingIQ', ckb: 'لەلایەن PrintingIQ دیاریکراوە' },
  ratesBy: { en: 'Dollar market rate from {source}', ar: 'سعر الدولار في السوق من {source}', ckb: 'نرخی دۆلاری بازاڕ لە {source}' },
  curDinar: { en: 'dinars', ar: 'الدينار', ckb: 'دینار' },
  curDollar: { en: 'dollars', ar: 'الدولار', ckb: 'دۆلار' },
  soldBy: { en: 'Sold by', ar: 'يبيعه', ckb: 'فرۆشیار' },
  productsCount: { en: 'products', ar: 'منتج', ckb: 'بەرهەم' },
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
  hero1Title: { en: "Iraq's print & stationery marketplace", ar: 'سوق الطباعة والقرطاسية في العراق', ckb: 'بازاڕی چاپ و قرتاسیە لە عێراق' },
  hero1Sub: { en: 'Sign materials, machines, stationery and gifts from vendors across Iraq', ar: 'مواد الدعاية، المكائن، القرطاسية والهدايا من بائعين في كل العراق', ckb: 'کەرەستەی ڕیکلام، ئامێر، قرتاسیە و دیاری لە فرۆشیارانی هەموو عێراق' },
  hero1Cta: { en: 'Browse products', ar: 'تصفح المنتجات', ckb: 'سەیری بەرهەمەکان بکە' },
  hero2Title: { en: 'Contact vendors directly on WhatsApp', ar: 'تواصل مع البائع مباشرة على واتساب', ckb: 'ڕاستەوخۆ لە واتسئەپ پەیوەندی بە فرۆشیار بکە' },
  hero2Sub: { en: 'Pick a product and tap WhatsApp: the vendor gets your request through PrintingIQ', ar: 'اختر المنتج واضغط واتساب، ويصل طلبك للبائع عبر PrintingIQ', ckb: 'بەرهەم هەڵبژێرە و واتسئەپ دابگرە، داواکارییەکەت لە ڕێگەی PrintingIQ دەگاتە فرۆشیار' },
  hero2Cta: { en: 'Find a product', ar: 'ابحث عن منتج', ckb: 'بەرهەمێک بدۆزەرەوە' },
  hero3Title: { en: 'Are you a vendor? Sell on PrintingIQ', ar: 'هل أنت بائع؟ بِع على PrintingIQ', ckb: 'فرۆشیاری؟ لە PrintingIQ بفرۆشە' },
  hero3Sub: { en: 'Open your shop, add products in three languages and receive customer inquiries', ar: 'افتح متجرك، أضف منتجاتك بثلاث لغات واستقبل طلبات الزبائن', ckb: 'دوکانەکەت بکەرەوە، بەرهەمەکانت بە سێ زمان دابنێ و داواکاری کڕیاران وەربگرە' },
  hero3Cta: { en: 'Start selling', ar: 'ابدأ البيع', ckb: 'دەست بە فرۆشتن بکە' },
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
  priceList: { en: "Price list", ar: "قائمة الأسعار", ckb: "لیستی نرخ" },
  priceListIntro: { en: "Tick what you sell and type your price. Each ticked item appears in your shop and in price comparisons.", ar: "ضع علامة على ما تبيعه واكتب سعرك. كل منتج تختاره يظهر في متجرك وفي مقارنة الأسعار.", ckb: "ئەوەی دەیفرۆشیت نیشانە بکە و نرخەکەت بنووسە. هەر بابەتێک هەڵیبژێریت لە دوکانەکەت و لە بەراوردی نرخدا دەردەکەوێت." },
  savePriceList: { en: "Save price list", ar: "حفظ قائمة الأسعار", ckb: "پاشەکەوتکردنی لیستی نرخ" },
  priceListSaved: { en: "Price list saved: {n} items in your shop.", ar: "تم حفظ قائمة الأسعار: {n} منتج في متجرك.", ckb: "لیستی نرخ پاشەکەوت کرا: {n} بابەت لە دوکانەکەت." },
  filterItems: { en: "Filter items…", ar: "بحث في المنتجات…", ckb: "گەڕان لە بابەتەکان…" },
  selectedCount: { en: "{n} selected", ar: "{n} محدد", ckb: "{n} هەڵبژێردراو" },
  comparePrices: { en: "Compare prices", ar: "قارن الأسعار", ckb: "بەراوردی نرخ" },
  comparePricesIntro: { en: "The same standard items from different vendors, cheapest first. Dollar prices are compared at today's market rate.", ar: "نفس المنتجات القياسية من بائعين مختلفين، الأرخص أولاً. أسعار الدولار تُقارن بسعر السوق اليوم.", ckb: "هەمان بابەتی ستاندارد لە فرۆشیاری جیاواز، هەرزانترین سەرەتا. نرخی دۆلار بە نرخی بازاڕی ئەمڕۆ بەراورد دەکرێت." },
  fromPrice: { en: "from {price}", ar: "من {price}", ckb: "لە {price}" },
  vendorsCount: { en: "{n} vendors", ar: "{n} بائع", ckb: "{n} فرۆشیار" },
  compareN: { en: "Compare prices from {n} vendors", ar: "قارن أسعار {n} بائعين", ckb: "بەراوردی نرخی {n} فرۆشیار" },
  noPricesYet: { en: "No vendor has priced this item yet.", ar: "لم يضع أي بائع سعراً لهذا المنتج بعد.", ckb: "هێشتا هیچ فرۆشیارێک نرخی ئەم بابەتەی دانەناوە." },
  cheapest: { en: "Cheapest", ar: "الأرخص", ckb: "هەرزانترین" },
  changePrices: { en: "Change all prices", ar: "تغيير كل الأسعار", ckb: "گۆڕینی هەموو نرخەکان" },
  changePricesHint: { en: "For example 5 to raise every price by 5%, or -10 to lower by 10%. Dinar prices are rounded like shops quote them.", ar: "مثلاً 5 لرفع كل الأسعار 5٪، أو -10 لتخفيضها 10٪. أسعار الدينار تُقرَّب كما في المحلات.", ckb: "بۆ نموونە 5 بۆ بەرزکردنەوەی هەموو نرخەکان ٥٪، یان -10 بۆ دابەزاندن ١٠٪. نرخی دینار وەک دوکانەکان خڕ دەکرێتەوە." },
  percent: { en: "Percent (%)", ar: "النسبة (٪)", ckb: "ڕێژە (٪)" },
  applyChange: { en: "Apply to {n} products", ar: "تطبيق على {n} منتج", ckb: "جێبەجێکردن لەسەر {n} بەرهەم" },
  pricesChanged: { en: "Updated {n} prices.", ar: "تم تحديث {n} سعر.", ckb: "{n} نرخ نوێکرایەوە." },
  onlyCurrency: { en: "Only prices in", ar: "فقط الأسعار بـ", ckb: "تەنها نرخەکانی بە" },
  allCurrencies: { en: "All", ar: "الكل", ckb: "هەموو" },
  comparePricesSub: { en: "Same item, every vendor, cheapest first", ar: "نفس المنتج من كل البائعين، الأرخص أولاً", ckb: "هەمان بابەت لە هەموو فرۆشیاران، هەرزانترین سەرەتا" },
  getOffers: { en: "Get offers", ar: "اطلب عروض أسعار", ckb: "داوای نرخ بکە" },
  getOffersSub: { en: "Describe your job, vendors send you prices", ar: "صف طلبك ويرسل لك البائعون أسعارهم", ckb: "کارەکەت باس بکە، فرۆشیاران نرخت بۆ دەنێرن" },
  requestTitle: { en: "Ask vendors for offers", ar: "اطلب عروضاً من البائعين", ckb: "داوای نرخ لە فرۆشیاران بکە" },
  requestIntro: { en: "Tell vendors what you need. Every vendor on PrintingIQ is notified and can send you a price; you'll see the offers here and on WhatsApp.", ar: "أخبر البائعين بما تحتاجه. يصل الإشعار لكل البائعين على PrintingIQ ويمكنهم إرسال أسعارهم؛ سترى العروض هنا وعلى واتساب.", ckb: "پێویستییەکەت بە فرۆشیاران بڵێ. هەموو فرۆشیارانی PrintingIQ ئاگادار دەکرێنەوە و دەتوانن نرخت بۆ بنێرن؛ نرخەکان لێرە و لە واتسئەپ دەبینیت." },
  whatKind: { en: "What kind of job?", ar: "ما نوع الطلب؟", ckb: "جۆری کارەکە چییە؟" },
  describeJob: { en: "Describe the job", ar: "صف الطلب", ckb: "کارەکە باس بکە" },
  describeJobHint: { en: "Size, material, colours, sides, finish… for example \"Business cards, two sides, matte, with gold foil logo\".", ar: "المقاس، المادة، الألوان، الوجهين، التشطيب… مثلاً \"كروت شخصية وجهين مط مع شعار ذهبي\".", ckb: "قەبارە، کەرەستە، ڕەنگ، ڕوو، کۆتایی… بۆ نموونە \"کارتی بازرگانی دوو ڕوو، مات، لۆگۆی زێڕین\"." },
  quantity: { en: "Quantity", ar: "الكمية", ckb: "بڕ" },
  quantityHint: { en: "For example 500 pieces, or 3 × 2 metres", ar: "مثلاً 500 قطعة، أو 3 × 2 متر", ckb: "بۆ نموونە ٥٠٠ دانە، یان ٣ × ٢ مەتر" },
  deliverTo: { en: "City", ar: "المدينة", ckb: "شار" },
  attachDesign: { en: "Attach design or photo (optional)", ar: "أرفق التصميم أو صورة (اختياري)", ckb: "دیزاین یان وێنە هاوپێچ بکە (ئارەزوومەندانە)" },
  addFile: { en: "Add file", ar: "إضافة ملف", ckb: "زیادکردنی فایل" },
  sendRequest: { en: "Send to vendors", ar: "أرسل للبائعين", ckb: "ناردن بۆ فرۆشیاران" },
  requestSent: { en: "Your request was sent to vendors. Keep this page: offers appear here.", ar: "تم إرسال طلبك للبائعين. احتفظ بهذه الصفحة: تظهر العروض هنا.", ckb: "داواکارییەکەت بۆ فرۆشیاران نێردرا. ئەم پەڕەیە بپارێزە: نرخەکان لێرە دەردەکەون." },
  myRequests: { en: "My requests", ar: "طلباتي", ckb: "داواکارییەکانم" },
  noRequests: { en: "No requests yet.", ar: "لا توجد طلبات بعد.", ckb: "هێشتا هیچ داواکارییەک نییە." },
  offers: { en: "Offers", ar: "العروض", ckb: "نرخەکان" },
  noOffersYet: { en: "No offers yet. Vendors usually reply within a few hours; you'll also get them on WhatsApp.", ar: "لا توجد عروض بعد. عادةً يرد البائعون خلال ساعات؛ ستصلك أيضاً على واتساب.", ckb: "هێشتا هیچ نرخێک نییە. فرۆشیاران زۆرجار لە چەند کاتژمێرێکدا وەڵام دەدەنەوە؛ لە واتسئەپیش پێت دەگات." },
  readyIn: { en: "Ready in {n} days", ar: "جاهز خلال {n} أيام", ckb: "لە {n} ڕۆژدا ئامادە دەبێت" },
  closeRequest: { en: "I found a vendor, close request", ar: "وجدت بائعاً، أغلق الطلب", ckb: "فرۆشیارم دۆزییەوە، داخستنی داواکاری" },
  requestClosed: { en: "Closed", ar: "مغلق", ckb: "داخراوە" },
  requests: { en: "Price requests", ar: "طلبات الأسعار", ckb: "داوای نرخ" },
  requestsIntro: { en: "Customers asking for prices. Send an offer: it is saved here and the customer gets it on WhatsApp.", ar: "زبائن يطلبون أسعاراً. أرسل عرضك: يُحفظ هنا ويصل للزبون على واتساب.", ckb: "کڕیاران داوای نرخ دەکەن. نرخەکەت بنێرە: لێرە پاشەکەوت دەبێت و بە واتسئەپ دەگاتە کڕیار." },
  onlyMyCategories: { en: "Only my categories", ar: "أقسامي فقط", ckb: "تەنها بەشەکانی من" },
  sendOffer: { en: "Send offer", ar: "أرسل العرض", ckb: "ناردنی نرخ" },
  offerSent: { en: "Offer sent", ar: "تم إرسال العرض", ckb: "نرخ نێردرا" },
  editOffer: { en: "Change offer", ar: "تعديل العرض", ckb: "گۆڕینی نرخ" },
  yourPrice: { en: "Your price", ar: "سعرك", ckb: "نرخەکەت" },
  offerNote: { en: "Note (material, what's included…)", ar: "ملاحظة (المادة، ما يشمله السعر…)", ckb: "تێبینی (کەرەستە، چی تێدایە…)" },
  days: { en: "Ready in (days)", ar: "جاهز خلال (أيام)", ckb: "ئامادە دەبێت لە (ڕۆژ)" },
  offerWa: { en: "Hello {name}, this is {shop} on PrintingIQ. For your request \"{job}\" our price is {price}.", ar: "مرحباً {name}، معك {shop} من PrintingIQ. لطلبك \"{job}\" سعرنا {price}.", ckb: "سڵاو {name}، ئەمە {shop}ە لە PrintingIQ. بۆ داواکارییەکەت \"{job}\" نرخمان {price}یە." },
  files: { en: "Files", ar: "الملفات", ckb: "فایلەکان" },
  ago: { en: "{t} ago", ar: "قبل {t}", ckb: "{t} لەمەوبەر" },
  anyCategory: { en: "Any", ar: "أي قسم", ckb: "هەر بەشێک" },
  needJob: { en: "Please describe the job and give your name and phone.", ar: "يرجى وصف الطلب وكتابة اسمك ورقم هاتفك.", ckb: "تکایە کارەکە باس بکە و ناو و ژمارەی تەلەفۆنت بنووسە." },
  waOfferReply: { en: "Hello {vendor}, about your offer on PrintingIQ for my request:", ar: "مرحباً {vendor}، بخصوص عرضك على PrintingIQ لطلبي:", ckb: "سڵاو {vendor}، دەربارەی نرخەکەت لە PrintingIQ بۆ داواکارییەکەم:" },
  cancel: { en: "Cancel", ar: "إلغاء", ckb: "هەڵوەشاندنەوە" },
  addMany: { en: "Add many products", ar: "إضافة منتجات كثيرة", ckb: "زیادکردنی چەندین بەرهەم" },
  addManyIntro: { en: "Choose the way that's easiest for you. You'll check everything before it's published.", ar: "اختر الطريقة الأسهل لك. ستراجع كل شيء قبل النشر.", ckb: "ئاسانترین ڕێگا هەڵبژێرە. پێش بڵاوکردنەوە هەمووی دەبینیتەوە." },
  fromExcel: { en: "Excel or CSV file", ar: "ملف Excel أو CSV", ckb: "فایلی Excel یان CSV" },
  fromExcelSub: { en: "One product per row. Any column names in Kurdish, Arabic or English.", ar: "منتج في كل سطر. بأي أسماء أعمدة بالكردية أو العربية أو الإنجليزية.", ckb: "هەر ڕیزێک بەرهەمێک. ناوی ستوونەکان بە کوردی، عەرەبی یان ئینگلیزی." },
  downloadTemplate: { en: "Download template", ar: "تنزيل النموذج", ckb: "داگرتنی نموونە" },
  fromPriceList: { en: "Price list PDF or photo (AI)", ar: "قائمة أسعار PDF أو صورة (ذكاء اصطناعي)", ckb: "لیستی نرخ PDF یان وێنە (AI)" },
  fromPriceListSub: { en: "AI reads your price list and writes every product in three languages.", ar: "يقرأ الذكاء الاصطناعي قائمة أسعارك ويكتب كل منتج بثلاث لغات.", ckb: "AI لیستی نرخەکەت دەخوێنێتەوە و هەموو بەرهەمێک بە سێ زمان دەنووسێت." },
  fromPhotos: { en: "Product photos (AI)", ar: "صور المنتجات (ذكاء اصطناعي)", ckb: "وێنەی بەرهەمەکان (AI)" },
  fromPhotosSub: { en: "One photo per product. AI writes the name, description and category.", ar: "صورة لكل منتج. يكتب الذكاء الاصطناعي الاسم والوصف والقسم.", ckb: "هەر بەرهەمێک وێنەیەک. AI ناو، وەسف و بەش دەنووسێت." },
  fromText: { en: "Paste a list (AI)", ar: "الصق قائمة (ذكاء اصطناعي)", ckb: "لیستێک بلکێنە (AI)" },
  fromTextSub: { en: "Copy your list from WhatsApp, Telegram or a document and paste it here.", ar: "انسخ قائمتك من واتساب أو تلغرام أو أي مستند والصقها هنا.", ckb: "لیستەکەت لە واتسئەپ، تێلێگرام یان بەڵگەنامەیەک کۆپی بکە و لێرە بیلکێنە." },
  pasteHere: { en: "Paste your list here", ar: "الصق قائمتك هنا", ckb: "لیستەکەت لێرە بلکێنە" },
  readList: { en: "Read the list", ar: "اقرأ القائمة", ckb: "لیستەکە بخوێنەوە" },
  chooseFile: { en: "Choose file", ar: "اختر ملفاً", ckb: "فایل هەڵبژێرە" },
  choosePhotos: { en: "Choose photos", ar: "اختر صوراً", ckb: "وێنە هەڵبژێرە" },
  reading: { en: "Reading… {n}", ar: "جارٍ القراءة… {n}", ckb: "دەخوێندرێتەوە… {n}" },
  reviewTitle: { en: "Check before publishing", ar: "راجع قبل النشر", ckb: "پێش بڵاوکردنەوە بیپشکنە" },
  reviewIntro: { en: "{n} products found. Untick any you don't want, fix names, prices and categories, then publish.", ar: "تم العثور على {n} منتج. أزل العلامة عمّا لا تريده، وصحح الأسماء والأسعار والأقسام، ثم انشر.", ckb: "{n} بەرهەم دۆزرایەوە. ئەوەی نایەوێت نیشانەکەی لابە، ناو و نرخ و بەشەکان ڕاست بکەرەوە، پاشان بڵاوی بکەرەوە." },
  publishN: { en: "Publish {n} products", ar: "نشر {n} منتج", ckb: "بڵاوکردنەوەی {n} بەرهەم" },
  publishedN: { en: "{n} products published.", ar: "تم نشر {n} منتج.", ckb: "{n} بەرهەم بڵاوکرایەوە." },
  categoryForAll: { en: "Category for products without one", ar: "القسم للمنتجات بدون قسم", ckb: "بەش بۆ ئەو بەرهەمانەی بەشیان نییە" },
  chooseCategory: { en: "Choose category", ar: "اختر القسم", ckb: "بەش هەڵبژێرە" },
  startOver: { en: "Start over", ar: "ابدأ من جديد", ckb: "دووبارە دەست پێبکەرەوە" },
  fillWithAi: { en: "Fill from photo with AI", ar: "املأ من الصورة بالذكاء الاصطناعي", ckb: "پڕکردنەوە لە وێنە بە AI" },
  fillWithAiSub: { en: "Take or choose a photo: AI writes the name, description and category in three languages. Check them before publishing.", ar: "التقط أو اختر صورة: يكتب الذكاء الاصطناعي الاسم والوصف والقسم بثلاث لغات. راجعها قبل النشر.", ckb: "وێنەیەک بگرە یان هەڵبژێرە: AI ناو، وەسف و بەش بە سێ زمان دەنووسێت. پێش بڵاوکردنەوە بیپشکنە." },
  aiFilled: { en: "Filled in from the photo. Check the text, then add your price.", ar: "تمت التعبئة من الصورة. راجع النص ثم أضف سعرك.", ckb: "لە وێنەکەوە پڕکرایەوە. دەقەکە بپشکنە، پاشان نرخەکەت زیاد بکە." },
  aiErr_unavailable: { en: "AI help needs the online database. Add products by hand or with an Excel file for now.", ar: "المساعدة بالذكاء الاصطناعي تحتاج قاعدة البيانات الإلكترونية. أضف المنتجات يدوياً أو بملف Excel حالياً.", ckb: "یارمەتی AI پێویستی بە داتابەیسی ئۆنلاینە. ئێستا بەرهەم بە دەست یان بە فایلی Excel زیاد بکە." },
  aiErr_daily_limit: { en: "You've used today's AI help. Try again tomorrow.", ar: "استخدمت المساعدة بالذكاء الاصطناعي لليوم. حاول غداً.", ckb: "یارمەتی AI ی ئەمڕۆت بەکارهێنا. سبەی هەوڵ بدەرەوە." },
  aiErr_too_large: { en: "The file is too big (12 MB at most). Try fewer pages or smaller photos.", ar: "الملف كبير جداً (12 ميغابايت كحد أقصى). جرّب صفحات أقل أو صوراً أصغر.", ckb: "فایلەکە زۆر گەورەیە (زۆرترین ١٢ مێگابایت). لاپەڕەی کەمتر یان وێنەی بچووکتر تاقی بکەرەوە." },
  aiErr_other: { en: "AI couldn't read this. Try a clearer photo or another way.", ar: "لم يتمكن الذكاء الاصطناعي من القراءة. جرّب صورة أوضح أو طريقة أخرى.", ckb: "AI نەیتوانی بیخوێنێتەوە. وێنەیەکی ڕوونتر یان ڕێگایەکی تر تاقی بکەرەوە." },
  nothingFound: { en: "No products found in this file. Check that each row has a product name.", ar: "لم يتم العثور على منتجات في هذا الملف. تأكد أن كل سطر فيه اسم منتج.", ckb: "هیچ بەرهەمێک لەم فایلەدا نەدۆزرایەوە. دڵنیابە هەر ڕیزێک ناوی بەرهەمی تێدایە." },
  excelOnWebsite: { en: "Excel files can be read on the website. On the phone, save the sheet as CSV or use a photo of the list.", ar: "يمكن قراءة ملفات Excel على الموقع. على الهاتف احفظ الجدول كـ CSV أو استخدم صورة القائمة.", ckb: "فایلی Excel لە ماڵپەڕەکە دەخوێندرێتەوە. لە مۆبایل وەک CSV پاشەکەوتی بکە یان وێنەی لیستەکە بەکاربهێنە." },
  importLink: { en: "Import my shop from a link", ar: "استيراد متجري من رابط", ckb: "هێنانی دوکانەکەم لە بەستەرێکەوە" },
  importLinkSub: { en: "Your website (Shopify or WooCommerce), public Telegram channel or Instagram business account. After PrintingIQ approves it, your products are copied every night, with prices and photos.", ar: "موقعك (Shopify أو WooCommerce) أو قناة تلغرام عامة أو حساب إنستغرام تجاري. بعد موافقة PrintingIQ تُنسخ منتجاتك كل ليلة مع الأسعار والصور.", ckb: "ماڵپەڕەکەت (Shopify یان WooCommerce)، کەناڵی گشتی تێلێگرام یان هەژماری بازرگانی ئینستاگرام. دوای پەسەندکردنی PrintingIQ، بەرهەمەکانت هەموو شەوێک لەگەڵ نرخ و وێنە کۆپی دەکرێن." },
  linkPlaceholder: { en: "https://t.me/yourshop or https://yourshop.com", ar: "https://t.me/yourshop أو https://yourshop.com", ckb: "https://t.me/yourshop یان https://yourshop.com" },
  sendLink: { en: "Send for approval", ar: "أرسل للموافقة", ckb: "ناردن بۆ پەسەندکردن" },
  claimShop: { en: "Is one of these shops yours?", ar: "هل أحد هذه المتاجر لك؟", ckb: "ئایا یەکێک لەم دوکانانە هی تۆیە؟" },
  claimShopSub: { en: "PrintingIQ already lists these shops from their websites. Claim yours to manage it and receive its customers' messages; we'll call you to confirm.", ar: "يعرض PrintingIQ هذه المتاجر من مواقعها. اطلب متجرك لإدارته واستلام رسائل زبائنه؛ سنتصل بك للتأكيد.", ckb: "PrintingIQ ئەم دوکانانە لە ماڵپەڕەکانیانەوە پیشان دەدات. داوای دوکانەکەت بکە بۆ بەڕێوەبردن و وەرگرتنی نامەی کڕیارەکانی؛ پەیوەندیت پێوە دەکەین بۆ دڵنیابوونەوە." },
  claimThis: { en: "This is my shop", ar: "هذا متجري", ckb: "ئەمە دوکانی منە" },
  linkPending: { en: "Waiting for approval", ar: "بانتظار الموافقة", ckb: "چاوەڕێی پەسەندکردن" },
  linkApproved: { en: "Approved: imported every night", ar: "تمت الموافقة: يُستورد كل ليلة", ckb: "پەسەندکرا: هەموو شەوێک دەهێنرێت" },
  linkRejected: { en: "Not approved: contact PrintingIQ", ar: "لم تتم الموافقة: تواصل مع PrintingIQ", ckb: "پەسەند نەکرا: پەیوەندی بە PrintingIQ بکە" },
  lastImport: { en: "Last import: {r}", ar: "آخر استيراد: {r}", ckb: "دوایین هێنان: {r}" },
  remove: { en: "Remove", ar: "إزالة", ckb: "لابردن" },
  linkBad: { en: "That doesn't look like a link.", ar: "هذا لا يبدو رابطاً.", ckb: "ئەمە وەک بەستەر نییە." },
  linkUnsupported: { en: "Facebook pages, WhatsApp and OpenSooq can't be imported. Use a price list or photos instead.", ar: "لا يمكن استيراد صفحات فيسبوك وواتساب والسوق المفتوح. استخدم قائمة أسعار أو صوراً بدلاً من ذلك.", ckb: "پەڕەی فەیسبووک، واتسئەپ و OpenSooq ناهێنرێن. لە جیاتی ئەوە لیستی نرخ یان وێنە بەکاربهێنە." },
  fromLink: { en: "My website, Telegram or Instagram", ar: "موقعي أو تلغرام أو إنستغرام", ckb: "ماڵپەڕ، تێلێگرام یان ئینستاگرامەکەم" },
  fromLinkSub: { en: "Copied every night automatically, after approval.", ar: "تُنسخ تلقائياً كل ليلة بعد الموافقة.", ckb: "دوای پەسەندکردن هەموو شەوێک خۆکار کۆپی دەکرێت." },
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
