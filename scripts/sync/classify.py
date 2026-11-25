"""
Turns free text from shops and social posts into PrintingIQ data:
  category_for(text)  -> PrintingIQ subcategory id, or None when the item isn't print / sign / stationery related
  find_price(text)    -> (amount, 'IQD' | 'USD') or (None, None)
  split_lang(text)    -> {'en','ar','ckb'} with the text placed under the language it is written in
Keywords cover English, Arabic and Kurdish (Sorani).
"""
import re

_AR_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789')
_DIACRITICS = re.compile('[ً-ٰٟـ]')  # harakat + tatweel


def norm(s: str) -> str:
    """Lower-case and fold Arabic/Kurdish letter variants so keywords match either spelling."""
    s = (s or '').lower().translate(_AR_DIGITS)
    s = _DIACRITICS.sub('', s)
    for a, b in (('أ', 'ا'), ('إ', 'ا'), ('آ', 'ا'), ('ى', 'ي'), ('ی', 'ي'), ('ک', 'ك'), ('ە', 'ه'), ('ھ', 'ه'), ('ة', 'ه'),
                 ('ۆ', 'و'), ('ێ', 'ي'), ('ڵ', 'ل'), ('ڕ', 'ر'), ('‌', '')):
        s = s.replace(a, b)
    return s


# Items that look related but aren't what PrintingIQ lists.
DENY = [
    'scanner', 'ماسح', 'نقاط البيع', 'point of sale', 'mouse', 'ماوس', 'keyboard', 'كيبورد', 'headphone', 'سماعه',
    'safety sign', 'لافته سلامه', 'علامه سلامه', 'لوحه سلامه', 'لوحه تحذيريه', 'face mask', 'اقنعه', 'قناع',
    'drill', 'دريل', 'wrist watch', 'ساعه يد', 'smart watch', 'ساعه ذكيه', 'maintenance contract', 'عقد صيانه',
    'phone case', 'كفر موبايل', 'charger cable', 'كيبل', 'tape measure', 'laser measure', 'laser level', 'فيته', 'متر ليزري',
    'saw', 'منشار', 'thermometer', 'ثيرموميتر', 'ثرمومتر', 'كبان', 'لفل', 'laser pointer', 'مؤشر ليزر', 'فريزه',
    'منفاخ', 'ستيبلات مكبس', 'قطاعه', 'trimmer', 'تقليم', 'انابيب', 'بليت', 'بي ار سي', 'pvc pipe', 'زراعي', 'حدائق',
    'مسطره زاويه', 'مسطره فولاذيه', 'كلبس نوع', 'phone stand', 'ستاند للهاتف', 'ستاند الهاتف', 'ستاند للكمبيوتر', 'screwdriver', 'مفك براغي', 'wallet', 'محفظه',
]

# Ordered: the first matching rule wins, so specific phrases come before general words.
RULES: list[tuple[str, list[str]]] = [
    # Inks & consumables (before "printer", so "printer ink" is ink)
    ('uv-ink', ['uv ink', 'حبر uv']),
    ('solvent-ink', ['solvent ink', 'eco solvent ink', 'eco-solvent ink', 'حبر سولفنت', 'حبر ايكو', 'مەرەکەبی سۆڵڤێنت']),
    ('sublimation-ink', ['sublimation ink', 'sublimation paper', 'حبر سبلميشن', 'ورق سبلميشن', 'سەبلیمەیشن']),
    ('toner', ['toner', 'cartridge', 'ink tank', 'printer ink', 'ribbon', 'تونر', 'خرطوش', 'حبر طابع', 'شريط شمع',
               'شريط طباعه', 'شريط حبر', 'کارتریج', 'تۆنەر']),
    ('lamination', ['lamination', 'laminating', 'laminator', 'سلفنه', 'لامینەیشن', 'dtf film', 'dtf powder']),
    # Sign & print materials (cutting plotters first: "vinyl cutter" is a machine)
    ('plotter', ['cutting plotter', 'vinyl cutter', 'plotter', 'بلوتر', 'پلۆتەر']),
    ('acp', ['alucobond', 'aluminum composite', 'aluminium composite', 'acp sheet', 'الكوبوند', 'الوكوبوند', 'ئەلەکوبۆند']),
    ('acrylic', ['acrylic', 'plexiglass', 'plexi', 'اكريليك', 'اكرليك', 'بلكسي', 'ئەکریلیک']),
    ('foam', ['foam board', 'pvc foam', 'pvc board', 'forex', 'فوم', 'فۆم', 'بورد فوم']),
    ('flex', ['flex banner', 'flex roll', 'frontlit', 'backlit', 'فلكس', 'فليكس', 'فلێکس']),
    ('vinyl', ['vinyl', 'one way vision', 'sticker roll', 'فينيل', 'فاينل', 'ون وي', 'رول ستيكر', 'ستیکەر']),
    ('led', ['led module', 'led sign', 'neon', 'light box', 'lightbox', 'channel letter', 'موديول ليد', 'لوحه ليد', 'اضاءه ليد', 'ليد نيون', 'نيون', 'لايت بوكس', 'حروف بارزه']),
    ('menu-stand', ['menu stand', 'menu holder', 'حامل منيو', 'ستاند منيو', 'مێنیو']),
    ('stands', ['roll up', 'rollup', 'roll-up', 'x banner', 'x-banner', 'pop up', 'popup stand', 'backdrop', 'banner stand', 'display stand', 'رول اب',
                'ستاند اعلاني', 'ستاند عرض', 'ستاند بنر', 'ستاند رول', 'ستەندی ڕیکلام']),
    ('door-sign', ['door sign', 'name plate', 'nameplate', 'لوحه باب', 'سەردەرگا']),
    ('paper', ['photo paper', 'ورق صور', 'كاغەزی وێنە', 'art paper', 'كوشيه', 'ورق كوشه']),
    # Machines
    ('uv-printer', ['uv printer', 'uv flatbed', 'طابعه uv', 'چاپکەری uv']),
    ('heat-press', ['heat press', 'mug press', 'sublimation machine', 'مكبس', 'كبس حراري', 'ماكنه سبلميشن', 'پرێس']),
    ('large-format', ['large format', 'wide format', 'eco solvent printer', 'solvent printer', 'dtf printer', 'flex printer',
                      'طابعه فلكس', 'طابعه سولفنت', 'طابعه dtf', 'چاپکەری فۆرماتی گەورە']),
    ('screens', ['digital signage', 'advertising screen', 'advertising display', 'شاشه اعلان', 'شاشه عرض اعلان', 'شاشەی ڕیکلام']),
    ('office-print', ['printer', 'copier', 'photocopier', 'طابعه', 'طابعات', 'استنساخ', 'چاپکەر', 'پرینتەر', 'ماكنه طباعه']),
    # Laser machines after printers: a "laser printer" (طابعة ليزر) is an office printer
    ('laser-cnc', ['laser cut', 'laser engrav', 'co2 laser', 'fiber laser', 'cnc', 'cnc router', 'ليزر', 'راوتر cnc', 'لەیزەر']),
    # Gift sets before their contents and packaging ("gift set: pen + notebook", "gift set with packaging")
    ('gift-box', ['gift set', 'gift box', 'vip set', 'سيت هدايا', 'بوكس هدايا', 'علبه هدايا', 'طقم هدايا', 'سێتی دیاری', 'بۆکسی دیاری']),
    ('gift-bags', ['gift bag', 'paper bag', 'كيس هدايا', 'اكياس هدايا', 'كیسی دیاری']),
    # Printing services
    ('business-cards', ['business card', 'visit card', 'كارت شخصي', 'كروت شخصيه', 'بزنس كارد', 'کارتی بازرگانی']),
    ('flyers', ['flyer', 'brochure', 'leaflet', 'بروشور', 'فلاير', 'فلایەر']),
    ('banner-print', ['banner printing', 'poster printing', 'طباعه بنر', 'طباعه فلكس', 'طباعه بوستر']),
    ('sticker-print', ['label printing', 'sticker printing', 'طباعه ستيكر', 'طباعه ليبل']),
    ('packaging', ['packaging', 'box printing', 'طباعه علب', 'تغليف', 'پاکێجینگ']),
    # Stationery (specific holders before pens/cards)
    ('pen-box', ['pen box', 'pen case', 'pen holder', 'علبه قلم', 'حامل اقلام', 'بۆکسی قەڵەم']),
    ('card-holder', ['card holder', 'badge holder', 'lanyard', 'id holder', 'حامل بطاقات', 'حامل بطاقه', 'ئایدی هۆڵدەر']),
    ('certificate-holder', ['certificate holder', 'certificate folder', 'حافظه شهاده', 'ھەڵگری بڕوانامە']),
    ('calculators', ['calculator', 'حاسبات', 'حاسبه', 'حاسيبه', 'حاسیبە']),
    ('notebooks', ['notebook', 'note book', 'diary', 'agenda', 'planner', 'journal', 'notepad', 'دفتر', 'دفاتر', 'مفكره', 'مفكرات', 'اجنده', 'اجندات', 'دەفتەر']),
    ('folders', ['folder', 'document file', 'فايل', 'ملف', 'فۆڵدەر']),
    ('office-paper', ['a4 paper', 'copy paper', 'printing paper', 'ورق a4', 'ورق طباعه', 'ورق تصوير', 'کاغەزی a4']),
    ('office-supplies', ['stapler', 'staples', 'scissors', 'glue', 'adhesive tape', 'sharpener', 'eraser', 'ruler', 'paper clip',
                         'hole punch', 'desk organizer', 'whiteboard', 'دباسه', 'مقص', 'صمغ', 'مبراه', 'ممحاه', 'مسطره', 'دبابيس',
                         'مثقب', 'منظم مكتب', 'سبوره']),
    # Promotional (specific bags before pens: "pen" matches inside many words, so it comes late)
    ('laptop-bags', ['laptop bag', 'laptop backpack', 'backpack', 'حقيبه لابتوب', 'حقيبه ظهر', 'جانتای لاپتۆپ']),
    ('tissue-box', ['tissue box', 'tissue holder', 'علبه كلينكس', 'علبه محارم', 'کلێنس']),
    ('thermos', ['thermos', 'flask', 'tumbler', 'water bottle', 'vacuum bottle', 'ترمس', 'مطاره', 'زمزميه', 'قنينه', 'مەتارە']),
    ('mugs', ['mug', 'coffee cup', 'كوب', 'فنجان', 'كوپ']),
    ('keychains', ['keychain', 'key chain', 'key ring', 'ميداليه مفاتيح', 'سلسله مفاتيح', 'میدالیای کلیل']),
    ('powerbank', ['power bank', 'powerbank', 'باور بانك', 'پاوەربانک']),
    ('flash', ['usb flash', 'flash drive', 'flash memory', 'usb stick', 'فلاش', 'فلاش میمۆری']),
    ('clocks', ['wall clock', 'desk clock', 'clock', 'ساعه حائط', 'ساعه مكتب', 'كاتژمێر']),
    ('frames', ['photo frame', 'picture frame', 'برواز', 'اطار صوره', 'چوارچێوەی وێنە']),
    ('sunshade', ['sunshade', 'car shade', 'مظله سياره', 'سايبر']),
    # Awards
    ('crystal', ['crystal award', 'crystal', 'كريستال', 'کریستاڵ']),
    ('wood-award', ['wooden award', 'wood award', 'درع خشب', 'خەڵاتی دار']),
    ('medals', ['medal', 'ميداليه', 'مەدالیا']),
    ('trophies', ['trophy', 'trophies', 'كاس بطوله', 'درع', 'دروع']),
    ('seals', ['rubber stamp', 'self-inking stamp', 'ختم', 'اختام']),
    # Apparel
    ('t-shirts', ['t-shirt', 'tshirt', 't shirt', 'polo shirt', 'تيشيرت', 'تيشرت', 'تی شێرت', 'قميص بولو']),
    ('vests', ['vest', 'سترة', 'صدريه', 'جليك', 'هێلەگ']),
    ('hats', ['cap', 'hat', 'قبعه', 'شەپقە']),
    ('bags', ['tote bag', 'bag', 'حقيبه', 'شنطه', 'جانتا']),
    # Writing instruments last: "pen"/"قلم" appear in many phrases
    ('pens', ['ballpoint', 'rollerball', 'ماركرات', 'fountain pen', 'pen', 'pencil', 'marker', 'highlighter', 'قلم', 'اقلام', 'ماركر',
              'رصاص', 'قەڵەم']),
]

_AR_PREFIX = '(?:وال|بال|فال|كال|لل|ال|و|ب|ل|ف|ك)?'


def _pattern(w: str, plural=False) -> re.Pattern:
    """Latin keywords match whole words (so "cap" doesn't hit "capacity").
    Arabic-script keywords must start a word, after an optional prefix such as ال or و (so "ليد" doesn't hit "اليدوية");
    any ending is allowed (plurals, ه, ات…)."""
    if re.search('[a-z]', w):
        return re.compile(r'(?<![a-z])' + re.escape(w) + (r's?' if plural else '') + r'(?![a-z])')
    return re.compile(r'(?<![\u0600-\u06FF])' + _AR_PREFIX + re.escape(w))


_COMPILED: list[tuple[str, list[re.Pattern]]] = []
for cat, words in RULES:
    pats = []
    for w in words:
        w = norm(w).strip()
        # Latin words match whole words (so "cap" doesn't hit "capacity"); Arabic script matches inside words (ال، و، ب prefixes).
        pats.append(_pattern(w, plural=True))
    _COMPILED.append((cat, pats))
_DENY = [_pattern(norm(w).strip()) for w in DENY]


def category_for(*texts: str) -> str | None:
    """Category of the first text that matches (pass the title first, then fallbacks such as the shop's own category)."""
    for t in texts:
        n = norm(t)
        if not n.strip():
            continue
        if any(p.search(n) for p in _DENY):
            return None
        for cat, pats in _COMPILED:
            if any(p.search(n) for p in pats):
                return cat
    return None


_NUM = r'(\d{1,3}(?:[.,]\d{3})+|\d+(?:\.\d+)?)'
_PRICE_PATTERNS = [
    (re.compile(r'\$\s*' + _NUM), 'USD', 1),
    (re.compile(_NUM + r'\s*(?:\$|usd|dollars?|دولار|دۆلار)'), 'USD', 1),
    (re.compile(_NUM + r'\s*(?:الف|الاف|هزار|ھەزار|k)\s*(?:دينار|دينار عراقي|د\.?ع|iqd)?'), 'IQD', 1000),
    (re.compile(_NUM + r'\s*(?:iqd|د\.?ع|دينار|دینار)'), 'IQD', 1),
    (re.compile(r'(?:السعر|سعر|نرخ|price)\s*[:：\-]?\s*' + _NUM), 'IQD?', 1),
]


def _to_number(s: str) -> float:
    if re.fullmatch(r'\d{1,3}(?:[.,]\d{3})+', s):
        return float(re.sub('[.,]', '', s))
    return float(s.replace(',', ''))


def find_price(text: str) -> tuple[float | int | None, str | None]:
    """First price written in a post, e.g. "$25", "25 دولار", "15,000 دينار", "15 الف", "السعر 12000"."""
    n = norm(text).replace('هه', 'ه')
    for pat, cur, mult in _PRICE_PATTERNS:
        m = pat.search(n)
        if not m:
            continue
        v = _to_number(m.group(1)) * mult
        if cur == 'IQD?':  # a bare number after "price": small numbers are dollars, large ones dinars
            cur = 'USD' if v < 1000 else 'IQD'
        if v <= 0:
            continue
        return (int(v) if float(v).is_integer() else round(v, 2)), cur
    return None, None


_KURDISH_ONLY = re.compile('[ڕڵێۆەڤگچپژ]')  # letters used in Sorani but not Arabic (پ چ ژ گ appear in loanwords; good enough with ە ێ ۆ)
_ARABIC_SCRIPT = re.compile('[؀-ۿ]')


def lang_of(text: str) -> str:
    if _KURDISH_ONLY.search(text or '') and re.search('[ەێۆڕڵ]', text):
        return 'ckb'
    if _ARABIC_SCRIPT.search(text or ''):
        return 'ar'
    return 'en'


def split_lang(text: str) -> dict:
    out = {'en': '', 'ar': '', 'ckb': ''}
    if text:
        out[lang_of(text)] = text
    return out
