import type { Unit } from './catalog';
import type { Localized } from './i18n';

/**
 * Standard items most Iraqi print, sign and stationery shops sell. A vendor ticks the ones they make and types a price
 * (Vendor dashboard → Price list), so a whole shop is listed in minutes; customers can then compare the same item
 * across vendors (/prices). Products made this way carry `templateId`.
 * Keep ids stable: products in the database point at them.
 */
export type StandardItem = { id: string; categoryId: string; unit: Unit; name: Localized; note?: Localized };

const i = (id: string, categoryId: string, unit: Unit, en: string, ar: string, ckb: string, note?: Localized): StandardItem =>
  ({ id, categoryId, unit, name: { en, ar, ckb }, note });

const per1000: Localized = { en: 'Price per 1,000', ar: 'السعر لكل 1000', ckb: 'نرخ بۆ هەر ١٠٠٠' };
const per100: Localized = { en: 'Price per 100', ar: 'السعر لكل 100', ckb: 'نرخ بۆ هەر ١٠٠' };
const perM2: Localized = { en: 'Price per square metre', ar: 'السعر للمتر المربع', ckb: 'نرخ بۆ هەر مەتر دووجا' };

export const STANDARD_ITEMS: StandardItem[] = [
  // Printing services
  i('bc-1side', 'business-cards', 'box', 'Business cards, one side (1,000)', 'كروت شخصية وجه واحد (1000)', 'کارتی بازرگانی یەک ڕوو (١٠٠٠)', per1000),
  i('bc-2side', 'business-cards', 'box', 'Business cards, two sides (1,000)', 'كروت شخصية وجهين (1000)', 'کارتی بازرگانی دوو ڕوو (١٠٠٠)', per1000),
  i('bc-lux', 'business-cards', 'box', 'Luxury business cards (soft touch / foil, 1,000)', 'كروت شخصية فاخرة (سوفت تج / ذهبي، 1000)', 'کارتی بازرگانی لوکس (سۆفت تەچ / فۆیڵ، ١٠٠٠)', per1000),
  i('flyer-a5', 'flyers', 'pack', 'A5 flyers (1,000)', 'فلاير A5 (1000)', 'فلایەری A5 (١٠٠٠)', per1000),
  i('flyer-a4', 'flyers', 'pack', 'A4 flyers (1,000)', 'فلاير A4 (1000)', 'فلایەری A4 (١٠٠٠)', per1000),
  i('brochure-a4', 'flyers', 'pack', 'A4 folded brochure (1,000)', 'بروشور A4 مطوي (1000)', 'بڕۆشووری A4ی قەدکراو (١٠٠٠)', per1000),
  i('letterhead', 'flyers', 'pack', 'Letterheads A4 (1,000)', 'ورق رسمي A4 (1000)', 'سەرپەڕەی فەرمی A4 (١٠٠٠)', per1000),
  i('envelope', 'flyers', 'pack', 'Printed envelopes (1,000)', 'ظروف مطبوعة (1000)', 'زەرفی چاپکراو (١٠٠٠)', per1000),
  i('invitation', 'flyers', 'pack', 'Wedding / event invitations (100)', 'بطاقات دعوة (100)', 'کارتی بانگهێشت (١٠٠)', per100),
  i('receipt-book', 'flyers', 'piece', 'Receipt / invoice books', 'دفاتر وصولات وفواتير', 'دەفتەری پسوولە و فاکتۆرە'),
  i('flex-print', 'banner-print', 'm2', 'Flex banner printing', 'طباعة فليكس', 'چاپی فلێکس', perM2),
  i('flex-backlit', 'banner-print', 'm2', 'Backlit flex printing', 'طباعة فليكس باكلايت', 'چاپی فلێکسی باکلایت', perM2),
  i('vinyl-print', 'banner-print', 'm2', 'Sticker / vinyl printing', 'طباعة ستيكر', 'چاپی ستیکەر', perM2),
  i('one-way', 'banner-print', 'm2', 'One-way vision printing', 'طباعة ون وي فيجن', 'چاپی وەن وەی ڤیژن', perM2),
  i('canvas', 'banner-print', 'm2', 'Canvas printing', 'طباعة كانفاس', 'چاپی کانڤاس', perM2),
  i('poster-a3', 'banner-print', 'piece', 'A3 poster', 'بوستر A3', 'پۆستەری A3'),
  i('poster-a2', 'banner-print', 'piece', 'A2 poster', 'بوستر A2', 'پۆستەری A2'),
  i('sticker-roll', 'sticker-print', 'pack', 'Product labels on roll (1,000)', 'ليبل منتجات رول (1000)', 'لەیبڵی بەرهەم ڕۆڵ (١٠٠٠)', per1000),
  i('sticker-cut', 'sticker-print', 'pack', 'Die-cut stickers (100)', 'ستيكر مقصوص بالشكل (100)', 'ستیکەری بڕاو بە شێوە (١٠٠)', per100),
  i('box-print', 'packaging', 'pack', 'Printed product boxes (1,000)', 'علب مطبوعة (1000)', 'بۆکسی چاپکراو (١٠٠٠)', per1000),
  i('paper-bag', 'packaging', 'pack', 'Printed paper bags (100)', 'أكياس ورقية مطبوعة (100)', 'کیسی کاغەزی چاپکراو (١٠٠)', per100),
  i('pizza-box', 'packaging', 'pack', 'Pizza / food boxes (100)', 'علب بيتزا وطعام (100)', 'بۆکسی پیتزا و خواردن (١٠٠)', per100),
  // Signs
  i('rollup', 'stands', 'piece', 'Roll-up 85×200 cm with print', 'رول أب 85×200 مع الطباعة', 'ڕۆڵ ئەپ ٨٥×٢٠٠ لەگەڵ چاپ'),
  i('x-banner', 'stands', 'piece', 'X-banner stand with print', 'ستاند X بانر مع الطباعة', 'ستاندی X بانەر لەگەڵ چاپ'),
  i('popup', 'stands', 'piece', 'Pop-up display wall', 'ستاند بوب أب', 'دیواری پۆپ ئەپ'),
  i('sign-acp', 'acp', 'm2', 'Alucobond shop sign', 'لوحة محل ألكوبوند', 'تابلۆی دوکان ئەلەکوبۆند', perM2),
  i('sign-3d', 'led', 'piece', '3D LED letters (per letter)', 'حروف بارزة ليد (للحرف)', 'پیتی بەرجەستەی LED (بۆ هەر پیتێک)'),
  i('lightbox', 'led', 'm2', 'Light box sign', 'لوحة لايت بوكس', 'تابلۆی لایت بۆکس', perM2),
  i('acrylic-cut', 'acrylic', 'm2', 'Acrylic laser cutting', 'قص أكريليك بالليزر', 'بڕینی ئەکریلیک بە لەیزەر', perM2),
  i('door-plate', 'door-sign', 'piece', 'Office door sign', 'لوحة باب مكتب', 'تابلۆی دەرگای ئۆفیس'),
  i('car-wrap', 'vinyl', 'piece', 'Car wrap / car branding', 'تغليف وإعلان سيارات', 'بەرگی ئۆتۆمبێل و ڕیکلام'),
  // Materials
  i('acrylic-3mm', 'acrylic', 'sheet', 'Acrylic sheet 3 mm 122×244', 'لوح أكريليك 3 ملم 122×244', 'ئەکریلیکی ٣ ملم ١٢٢×٢٤٤'),
  i('foam-5mm', 'foam', 'sheet', 'Foam board 5 mm 122×244', 'فوم بورد 5 ملم 122×244', 'فۆم بۆردی ٥ ملم ١٢٢×٢٤٤'),
  i('acp-sheet', 'acp', 'sheet', 'Alucobond sheet 4 mm 122×244', 'لوح ألكوبوند 4 ملم 122×244', 'ئەلەکوبۆندی ٤ ملم ١٢٢×٢٤٤'),
  i('flex-roll', 'flex', 'roll', 'Flex roll (frontlit)', 'رول فليكس', 'ڕۆڵی فلێکس'),
  i('vinyl-roll', 'vinyl', 'roll', 'Printable vinyl roll', 'رول ستيكر للطباعة', 'ڕۆڵی ستیکەری چاپ'),
  i('a4-paper', 'office-paper', 'box', 'A4 copy paper (box of 5 reams)', 'ورق A4 (كرتونة 5 رزم)', 'کاغەزی A4 (کارتۆنی ٥ ڕزمە)'),
  // Inks & machines
  i('eco-ink', 'solvent-ink', 'liter', 'Eco-solvent ink 1 L', 'حبر إيكو سولفنت 1 لتر', 'مەرەکەبی ئیکۆ سۆڵڤێنت ١ لیتر'),
  i('sub-ink', 'sublimation-ink', 'liter', 'Sublimation ink 1 L', 'حبر سبلميشن 1 لتر', 'مەرەکەبی سەبلیمەیشن ١ لیتر'),
  i('toner-hp', 'toner', 'piece', 'Laser toner cartridge (HP / Canon)', 'خرطوشة تونر ليزر (HP / Canon)', 'کارتریجی تۆنەری لەیزەر (HP / Canon)'),
  i('lam-roll', 'lamination', 'roll', 'Lamination film roll', 'رول سلفنة', 'ڕۆڵی لامینەیشن'),
  i('heat-press-m', 'heat-press', 'piece', 'Heat press machine (T-shirt)', 'مكبس حراري للتيشيرت', 'پرێسی گەرمی تیشێرت'),
  i('mug-press', 'heat-press', 'piece', 'Mug press machine', 'مكبس أكواب', 'پرێسی کوپ'),
  i('plotter-m', 'plotter', 'piece', 'Vinyl cutting plotter', 'بلوتر قص ستيكر', 'پلۆتەری بڕینی ستیکەر'),
  // Promotional
  i('mug-print', 'mugs', 'piece', 'Printed mug', 'كوب مطبوع', 'کوپی چاپکراو'),
  i('mug-magic', 'mugs', 'piece', 'Magic (colour-changing) mug', 'كوب سحري', 'کوپی سیحری'),
  i('thermos-print', 'thermos', 'piece', 'Printed thermos / bottle', 'ترمس مطبوع', 'مەتارەی چاپکراو'),
  i('pen-print', 'pens', 'pack', 'Printed plastic pens (100)', 'أقلام بلاستيك مطبوعة (100)', 'قەڵەمی پلاستیکی چاپکراو (١٠٠)', per100),
  i('pen-metal', 'pens', 'piece', 'Engraved metal pen', 'قلم معدني محفور', 'قەڵەمی کانزای هەڵکۆڵراو'),
  i('keychain', 'keychains', 'piece', 'Printed / engraved keychain', 'ميدالية مفاتيح مطبوعة', 'کلیلەدانی چاپکراو'),
  i('usb-print', 'flash', 'piece', 'Branded USB flash 32 GB', 'فلاش 32 جيجا بالشعار', 'فلاشی ٣٢ گێگا بە لۆگۆ'),
  i('powerbank-print', 'powerbank', 'piece', 'Branded power bank 10,000 mAh', 'باور بانك 10000 بالشعار', 'پاوەربانکی ١٠٠٠٠ بە لۆگۆ'),
  i('calendar-desk', 'clocks', 'piece', 'Desk calendar', 'تقويم مكتبي', 'ڕۆژژمێری مێز'),
  i('calendar-wall', 'clocks', 'piece', 'Wall calendar', 'تقويم جداري', 'ڕۆژژمێری دیوار'),
  i('gift-set', 'gift-box', 'piece', 'VIP gift set (pen, notebook, flash)', 'طقم هدايا VIP (قلم، دفتر، فلاش)', 'سێتی دیاری VIP (قەڵەم، دەفتەر، فلاش)'),
  i('notebook-logo', 'notebooks', 'piece', 'A5 notebook with logo', 'دفتر A5 بالشعار', 'دەفتەری A5 بە لۆگۆ'),
  i('agenda', 'notebooks', 'piece', 'Yearly agenda / planner', 'أجندة سنوية', 'ئەجێندای ساڵانە'),
  i('folder-print', 'folders', 'pack', 'Printed presentation folders (100)', 'فولدرات مطبوعة (100)', 'فۆڵدەری چاپکراو (١٠٠)', per100),
  i('id-card', 'card-holder', 'piece', 'Plastic ID card with print', 'باج / هوية بلاستيك مطبوعة', 'کارتی ناسنامەی پلاستیکی چاپکراو'),
  i('lanyard', 'card-holder', 'piece', 'Printed lanyard', 'علاقة باج مطبوعة', 'بەندی باجی چاپکراو'),
  i('stamp', 'office-supplies', 'piece', 'Self-inking company stamp', 'ختم شركة أوتوماتيكي', 'مۆری کۆمپانیا (ئۆتۆماتیک)'),
  // Awards
  i('crystal-award', 'crystal', 'piece', 'Engraved crystal award', 'درع كريستال محفور', 'خەڵاتی کریستاڵی هەڵکۆڵراو'),
  i('wood-plaque', 'wood-award', 'piece', 'Wooden plaque with print', 'درع خشبي مطبوع', 'خەڵاتی داری چاپکراو'),
  i('medal', 'medals', 'piece', 'Metal medal with ribbon', 'ميدالية معدنية مع شريط', 'مەدالیای کانزا لەگەڵ شریت'),
  i('trophy', 'trophies', 'piece', 'Trophy cup', 'كأس', 'جام'),
  // Installation & design
  i('inst-flex', 'install-flex', 'm2', 'Flex installation on frame', 'تركيب فليكس على هيكل', 'دانانی فلێکس لەسەر چوارچێوە', perM2),
  i('inst-frame', 'install-flex', 'm2', 'Iron frame for flex sign', 'هيكل حديد للوحة فليكس', 'چوارچێوەی ئاسن بۆ تابلۆی فلێکس', perM2),
  i('inst-sticker', 'install-sticker', 'm2', 'Sticker installation on glass / wall', 'تركيب ستيكر على زجاج أو جدار', 'لکاندنی ستیکەر لەسەر شووشە یان دیوار', perM2),
  i('inst-frosted', 'install-sticker', 'm2', 'Frosted glass film installation', 'تركيب ستيكر مثلج للزجاج', 'لکاندنی ستیکەری تەماوی بۆ شووشە', perM2),
  i('inst-car', 'install-sticker', 'piece', 'Car wrap installation (full car)', 'تغليف سيارة كامل', 'بەرگکردنی تەواوی ئۆتۆمبێل'),
  i('inst-3d', 'install-sign', 'piece', '3D letter installation (per letter)', 'تركيب حروف بارزة (للحرف)', 'دانانی پیتی بەرجەستە (بۆ هەر پیتێک)'),
  i('inst-lightbox', 'install-sign', 'piece', 'Light box sign installation', 'تركيب لوحة لايت بوكس', 'دانانی تابلۆی لایت بۆکس'),
  i('inst-acp', 'install-acp', 'm2', 'Alucobond cladding with installation', 'تكسية ألكوبوند مع التركيب', 'داپۆشینی ئەلەکوبۆند لەگەڵ دانان', perM2),
  i('design-logo', 'design-service', 'piece', 'Logo design', 'تصميم شعار', 'دیزاینی لۆگۆ'),
  i('design-print', 'design-service', 'piece', 'Design for print (card, flyer, banner)', 'تصميم للطباعة (كرت، فلاير، بنر)', 'دیزاین بۆ چاپ (کارت، فلایەر، بانەر)'),
  i('sign-fix', 'sign-repair', 'piece', 'Sign repair visit (LED, lighting)', 'زيارة صيانة لوحة (ليد، إنارة)', 'سەردانی چاککردنەوەی تابلۆ (LED، ڕووناکی)'),
  // Clothing
  i('tshirt-print', 't-shirts', 'piece', 'T-shirt with logo print', 'تيشيرت مطبوع بالشعار', 'تیشێرتی چاپکراو بە لۆگۆ'),
  i('polo-embroid', 't-shirts', 'piece', 'Polo shirt with embroidery', 'بولو مطرز', 'پۆلۆی چنراو'),
  i('cap-print', 'hats', 'piece', 'Cap with logo', 'قبعة بالشعار', 'کڵاو بە لۆگۆ'),
  i('vest-print', 'vests', 'piece', 'Safety / staff vest with print', 'سترة عمل مطبوعة', 'هێلەگی کار چاپکراو'),
  i('tote-print', 'bags', 'piece', 'Cloth tote bag with print', 'حقيبة قماش مطبوعة', 'جانتای قوماشی چاپکراو'),
];

export const standardById = (id?: string) => (id ? STANDARD_ITEMS.find((x) => x.id === id) : undefined);
